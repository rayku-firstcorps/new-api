package model

import (
	"cmp"
	"database/sql"
	"fmt"
	"slices"
	"strings"

	"gorm.io/gorm"
)

// Read queries over behavior_events for the admin analytics API.
//
// Every aggregation is portable SQL (COUNT, COUNT(DISTINCT), AVG, SUM, GROUP
// BY, CASE) and runs unchanged on SQLite, MySQL, PostgreSQL and ClickHouse; no
// JSON functions and no dialect functions. Bucket arithmetic is
// `created_at - created_at % N`, valid because created_at is positive.

const (
	// Percentiles use a fixed 50 ms histogram (bin = v - v % 50, values above
	// 60000 ms fall in the last bin) and report the lower bound of the bin that
	// holds the nearest rank, so the error is below 50 ms. Memory is bounded by
	// 1201 bins per vital name (per day for the trend). The same code path runs
	// on every database, ClickHouse included (no quantile function).
	behaviorBinExpr = "(CASE WHEN duration_ms > 60000 THEN 60000 ELSE duration_ms END) - (CASE WHEN duration_ms > 60000 THEN 60000 ELSE duration_ms END) % 50"

	behaviorPageViewCount = "COUNT(CASE WHEN event_type = 'page_view' THEN 1 END)"
)

// BehaviorVitalNames is the fixed, ordered list of perf_vital event names.
var BehaviorVitalNames = []string{"vital.fcp", "vital.lcp", "vital.ttfb", "vital.route_change"}

// BehaviorDimensionColumns are the groupable columns of GetBehaviorDimension.
var BehaviorDimensionColumns = []string{"client_type", "os_family", "browser_family", "viewport_bucket", "lang", "theme"}

// BehaviorEventFilter is the common window: [StartTs, EndTs) on created_at,
// optionally limited to one client_type.
type BehaviorEventFilter struct {
	StartTs    int64
	EndTs      int64
	ClientType string
}

func (f BehaviorEventFilter) scope() *gorm.DB {
	tx := LOG_DB.Model(&BehaviorEvent{}).Where("created_at >= ? AND created_at < ?", f.StartTs, f.EndTs)
	if f.ClientType != "" {
		tx = tx.Where("client_type = ?", f.ClientType)
	}
	return tx
}

type BehaviorOverview struct {
	Pv                 int64   `json:"pv"`
	DeviceUv           int64   `json:"device_uv"`
	ActorUv            int64   `json:"actor_uv"`
	MultiDeviceActorUv int64   `json:"multi_device_actor_uv"`
	MultiDeviceRatio   float64 `json:"multi_device_ratio"`
	AvgDurationMs      float64 `json:"avg_duration_ms"`
	AvgActiveMs        float64 `json:"avg_active_ms"`
	ApiErrorCount      int64   `json:"api_error_count"`
	ApiErrorsPerPv     float64 `json:"api_errors_per_pv"`
}

// GetBehaviorOverview computes the headline numbers. api_errors_per_pv is
// api_error / max(pv, 1): successful requests are not instrumented, so a true
// error rate is impossible and errors per page view is the stand-in.
func GetBehaviorOverview(f BehaviorEventFilter) (*BehaviorOverview, error) {
	var row struct {
		Pv            int64
		DeviceUv      int64
		ActorUv       int64
		AvgDurationMs sql.NullFloat64
		AvgActiveMs   sql.NullFloat64
		ApiErrorCount int64
	}
	err := f.scope().Select(behaviorPageViewCount + " AS pv, " +
		"COUNT(DISTINCT device_id) AS device_uv, " +
		"COUNT(DISTINCT CASE WHEN actor_hash <> '' THEN actor_hash END) AS actor_uv, " +
		"AVG(CASE WHEN event_type = 'page_leave' THEN duration_ms END) AS avg_duration_ms, " +
		"AVG(CASE WHEN event_type = 'page_leave' THEN active_ms END) AS avg_active_ms, " +
		"COUNT(CASE WHEN event_type = 'api_error' THEN 1 END) AS api_error_count").Scan(&row).Error
	if err != nil {
		return nil, err
	}
	multiDeviceActors := f.scope().Select("actor_hash").Where("actor_hash <> ''").
		Group("actor_hash").Having("COUNT(DISTINCT device_id) >= 2")
	var multi int64
	if err := LOG_DB.Table("(?) AS multi_actors", multiDeviceActors).Count(&multi).Error; err != nil {
		return nil, err
	}
	overview := &BehaviorOverview{
		Pv:                 row.Pv,
		DeviceUv:           row.DeviceUv,
		ActorUv:            row.ActorUv,
		MultiDeviceActorUv: multi,
		AvgDurationMs:      row.AvgDurationMs.Float64,
		AvgActiveMs:        row.AvgActiveMs.Float64,
		ApiErrorCount:      row.ApiErrorCount,
		ApiErrorsPerPv:     float64(row.ApiErrorCount) / float64(max(row.Pv, 1)),
	}
	if row.ActorUv > 0 {
		overview.MultiDeviceRatio = float64(multi) / float64(row.ActorUv)
	}
	return overview, nil
}

type BehaviorTrendPoint struct {
	Ts       int64 `json:"ts"`
	Pv       int64 `json:"pv"`
	DeviceUv int64 `json:"device_uv"`
}

type BehaviorHourCount struct {
	Hour int   `json:"hour"`
	Pv   int64 `json:"pv"`
}

// GetBehaviorTrend returns UTC buckets (bucketSeconds wide, zero-filled and
// ascending) for the window.
func GetBehaviorTrend(f BehaviorEventFilter, bucketSeconds int64) ([]BehaviorTrendPoint, error) {
	var rows []struct {
		Bucket   int64
		Pv       int64
		DeviceUv int64
	}
	bucketExpr := fmt.Sprintf("created_at - created_at %% %d", bucketSeconds)
	err := f.scope().Select(bucketExpr + " AS bucket, " + behaviorPageViewCount + " AS pv, COUNT(DISTINCT device_id) AS device_uv").
		Group("bucket").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	byBucket := make(map[int64]BehaviorTrendPoint, len(rows))
	for _, row := range rows {
		byBucket[row.Bucket] = BehaviorTrendPoint{Ts: row.Bucket, Pv: row.Pv, DeviceUv: row.DeviceUv}
	}
	series := make([]BehaviorTrendPoint, 0, (f.EndTs-f.StartTs)/bucketSeconds+1)
	for ts := f.StartTs - f.StartTs%bucketSeconds; ts < f.EndTs; ts += bucketSeconds {
		point, ok := byBucket[ts]
		if !ok {
			point = BehaviorTrendPoint{Ts: ts}
		}
		series = append(series, point)
	}
	return series, nil
}

// GetBehaviorHourlyDistribution counts page views per user-local hour of day.
// SQL groups by (UTC hour bucket, tz_offset); Go converts to local time with
// tz_offset = Date.getTimezoneOffset() (UTC+8 is -480). Half-hour zones are
// attributed by the bucket start, an error of at most 30 minutes.
func GetBehaviorHourlyDistribution(f BehaviorEventFilter) ([]BehaviorHourCount, error) {
	var rows []struct {
		Bucket   int64
		TzOffset int
		Pv       int64
	}
	err := f.scope().Where("event_type = ?", "page_view").
		Select("created_at - created_at % 3600 AS bucket, tz_offset, COUNT(*) AS pv").
		Group("bucket, tz_offset").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	hours := make([]BehaviorHourCount, 24)
	for i := range hours {
		hours[i].Hour = i
	}
	for _, row := range rows {
		localMinutes := row.Bucket/60 - int64(row.TzOffset)
		hourIndex := localMinutes / 60
		if localMinutes%60 < 0 {
			hourIndex--
		}
		hours[((hourIndex%24)+24)%24].Pv += row.Pv
	}
	return hours, nil
}

type BehaviorDimensionItem struct {
	Key     string `json:"key" gorm:"column:dim_key"`
	Devices int64  `json:"devices"`
	Pv      int64  `json:"pv"`
}

// GetBehaviorDimension groups by one fixed column (devices desc, key asc).
// Rows with an empty value are reported with key "unknown".
func GetBehaviorDimension(f BehaviorEventFilter, column string) ([]BehaviorDimensionItem, error) {
	if !slices.Contains(BehaviorDimensionColumns, column) {
		return nil, fmt.Errorf("unsupported dimension column")
	}
	items := make([]BehaviorDimensionItem, 0)
	err := f.scope().
		Select(column + " AS dim_key, COUNT(DISTINCT device_id) AS devices, " + behaviorPageViewCount + " AS pv").
		Group(column).Order("devices DESC").Order("dim_key ASC").Limit(50).Scan(&items).Error
	if err != nil {
		return nil, err
	}
	for i := range items {
		if items[i].Key == "" {
			items[i].Key = "unknown"
		}
	}
	return items, nil
}

type BehaviorDeviceCombo struct {
	Combo  string `json:"combo"`
	Actors int64  `json:"actors"`
}

type BehaviorCrossDevice struct {
	ActorsTotal       int64                 `json:"actors_total"`
	ActorsMultiDevice int64                 `json:"actors_multi_device"`
	ActorsMultiClient int64                 `json:"actors_multi_client"`
	Combos            []BehaviorDeviceCombo `json:"combos"`
}

// GetBehaviorCrossDevice groups by (actor_hash, client_type, device_id),
// streams the rows and classifies each actor in Go. Anonymous events (empty
// actor_hash) are excluded.
func GetBehaviorCrossDevice(f BehaviorEventFilter) (*BehaviorCrossDevice, error) {
	rows, err := f.scope().Where("actor_hash <> ''").
		Select("actor_hash, client_type, device_id").
		Group("actor_hash, client_type, device_id").Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	type actorSet struct {
		devices map[string]struct{}
		clients map[string]struct{}
	}
	actors := make(map[string]*actorSet)
	for rows.Next() {
		var actor, clientType, deviceID string
		if err := rows.Scan(&actor, &clientType, &deviceID); err != nil {
			return nil, err
		}
		set := actors[actor]
		if set == nil {
			set = &actorSet{devices: map[string]struct{}{}, clients: map[string]struct{}{}}
			actors[actor] = set
		}
		set.devices[deviceID] = struct{}{}
		set.clients[clientType] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	result := &BehaviorCrossDevice{ActorsTotal: int64(len(actors)), Combos: []BehaviorDeviceCombo{}}
	comboCounts := make(map[string]int64)
	for _, set := range actors {
		if len(set.devices) >= 2 {
			result.ActorsMultiDevice++
		}
		if len(set.clients) >= 2 {
			result.ActorsMultiClient++
		}
		clients := make([]string, 0, len(set.clients))
		for client := range set.clients {
			clients = append(clients, client)
		}
		slices.Sort(clients)
		comboCounts[strings.Join(clients, "+")]++
	}
	for combo, count := range comboCounts {
		result.Combos = append(result.Combos, BehaviorDeviceCombo{Combo: combo, Actors: count})
	}
	slices.SortFunc(result.Combos, func(a, b BehaviorDeviceCombo) int {
		return cmp.Or(cmp.Compare(b.Actors, a.Actors), strings.Compare(a.Combo, b.Combo))
	})
	if len(result.Combos) > 20 {
		result.Combos = result.Combos[:20]
	}
	return result, nil
}

type BehaviorPageItem struct {
	RoutePath     string  `json:"route_path"`
	Pv            int64   `json:"pv"`
	Uv            int64   `json:"uv"`
	AvgDurationMs float64 `json:"avg_duration_ms"`
	AvgActiveMs   float64 `json:"avg_active_ms"`
}

// GetBehaviorPages ranks route templates by page views.
func GetBehaviorPages(f BehaviorEventFilter, limit int) ([]BehaviorPageItem, error) {
	var rows []struct {
		RoutePath     string
		Pv            int64
		Uv            int64
		AvgDurationMs sql.NullFloat64
		AvgActiveMs   sql.NullFloat64
	}
	err := f.scope().Where("event_type IN ?", []string{"page_view", "page_leave"}).Where("route_path <> ''").
		Select("route_path, " + behaviorPageViewCount + " AS pv, " +
			"COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN device_id END) AS uv, " +
			"AVG(CASE WHEN event_type = 'page_leave' THEN duration_ms END) AS avg_duration_ms, " +
			"AVG(CASE WHEN event_type = 'page_leave' THEN active_ms END) AS avg_active_ms").
		Group("route_path").Having(behaviorPageViewCount + " > 0").
		Order("pv DESC").Order("route_path ASC").Limit(limit).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	items := make([]BehaviorPageItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, BehaviorPageItem{
			RoutePath: row.RoutePath, Pv: row.Pv, Uv: row.Uv,
			AvgDurationMs: row.AvgDurationMs.Float64, AvgActiveMs: row.AvgActiveMs.Float64,
		})
	}
	return items, nil
}

type BehaviorFeatureItem struct {
	EventName string `json:"event_name"`
	Count     int64  `json:"count"`
	Devices   int64  `json:"devices"`
}

type BehaviorFeatureModule struct {
	Module string `json:"module"`
	Count  int64  `json:"count"`
}

type BehaviorFeatureByClient struct {
	EventName  string `json:"event_name"`
	ClientType string `json:"client_type"`
	Count      int64  `json:"count"`
}

type BehaviorFeatures struct {
	Items        []BehaviorFeatureItem     `json:"items"`
	Modules      []BehaviorFeatureModule   `json:"modules"`
	ByClientType []BehaviorFeatureByClient `json:"by_client_type"`
}

// GetBehaviorFeatures aggregates feature_use events. The event_name set is
// the closed whitelist (a few dozen names), so one grouped query feeds both
// the ranking and the module split; the limit applies to the ranking only.
func GetBehaviorFeatures(f BehaviorEventFilter, limit int) (*BehaviorFeatures, error) {
	all := make([]BehaviorFeatureItem, 0)
	err := f.scope().Where("event_type = ?", "feature_use").
		Select("event_name, COUNT(*) AS count, COUNT(DISTINCT device_id) AS devices").
		Group("event_name").Order("count DESC").Order("event_name ASC").Scan(&all).Error
	if err != nil {
		return nil, err
	}
	moduleCounts := make(map[string]int64)
	for _, item := range all {
		module, _, _ := strings.Cut(item.EventName, ".")
		moduleCounts[module] += item.Count
	}
	result := &BehaviorFeatures{
		Items:        all,
		Modules:      make([]BehaviorFeatureModule, 0, len(moduleCounts)),
		ByClientType: []BehaviorFeatureByClient{},
	}
	if len(result.Items) > limit {
		result.Items = result.Items[:limit]
	}
	for module, count := range moduleCounts {
		result.Modules = append(result.Modules, BehaviorFeatureModule{Module: module, Count: count})
	}
	slices.SortFunc(result.Modules, func(a, b BehaviorFeatureModule) int {
		return cmp.Or(cmp.Compare(b.Count, a.Count), strings.Compare(a.Module, b.Module))
	})
	if len(result.Items) == 0 {
		return result, nil
	}
	names := make([]string, 0, len(result.Items))
	for _, item := range result.Items {
		names = append(names, item.EventName)
	}
	err = f.scope().Where("event_type = ?", "feature_use").Where("event_name IN ?", names).
		Select("event_name, client_type, COUNT(*) AS count").
		Group("event_name, client_type").Order("event_name ASC").Order("client_type ASC").Scan(&result.ByClientType).Error
	if err != nil {
		return nil, err
	}
	return result, nil
}

type BehaviorVitalSummary struct {
	Name  string  `json:"name"`
	Count int64   `json:"count"`
	AvgMs float64 `json:"avg_ms"`
	P50Ms int64   `json:"p50_ms"`
	P95Ms int64   `json:"p95_ms"`
}

type BehaviorVitalTrendPoint struct {
	Ts    int64  `json:"ts"`
	Name  string `json:"name"`
	Count int64  `json:"count"`
	P50Ms int64  `json:"p50_ms"`
	P95Ms int64  `json:"p95_ms"`
}

type BehaviorApiErrorItem struct {
	ApiRoute      string  `json:"api_route"`
	StatusCode    int     `json:"status_code"`
	Count         int64   `json:"count"`
	AvgDurationMs float64 `json:"avg_duration_ms"`
}

type BehaviorClientErrorItem struct {
	ErrorName string `json:"error_name"`
	Count     int64  `json:"count"`
}

type behaviorBin struct {
	lowerMs int64
	count   int64
}

// histogramPercentile is the nearest-rank percentile over bins sorted by lower
// bound: rank = ceil(p*n/100); the answer is the lower bound of the bin whose
// cumulative count first reaches the rank.
func histogramPercentile(bins []behaviorBin, total int64, percentile int64) int64 {
	if total == 0 || len(bins) == 0 {
		return 0
	}
	rank := max((percentile*total+99)/100, 1)
	var cumulative int64
	for _, bin := range bins {
		cumulative += bin.count
		if cumulative >= rank {
			return bin.lowerMs
		}
	}
	return bins[len(bins)-1].lowerMs
}

// GetBehaviorVitals returns count, average and P50/P95 for the four vitals,
// always in BehaviorVitalNames order.
func GetBehaviorVitals(f BehaviorEventFilter) ([]BehaviorVitalSummary, error) {
	var rows []struct {
		EventName string
		Bin       int64
		Count     int64
		TotalMs   float64
	}
	err := f.scope().Where("event_type = ?", "perf_vital").
		Select("event_name, " + behaviorBinExpr + " AS bin, COUNT(*) AS count, SUM(duration_ms) AS total_ms").
		Group("event_name, bin").Order("bin ASC").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	bins := make(map[string][]behaviorBin)
	totals := make(map[string]int64)
	sums := make(map[string]float64)
	for _, row := range rows {
		bins[row.EventName] = append(bins[row.EventName], behaviorBin{row.Bin, row.Count})
		totals[row.EventName] += row.Count
		sums[row.EventName] += row.TotalMs
	}
	summaries := make([]BehaviorVitalSummary, 0, len(BehaviorVitalNames))
	for _, name := range BehaviorVitalNames {
		summary := BehaviorVitalSummary{Name: name, Count: totals[name]}
		if summary.Count > 0 {
			summary.AvgMs = sums[name] / float64(summary.Count)
			summary.P50Ms = histogramPercentile(bins[name], summary.Count, 50)
			summary.P95Ms = histogramPercentile(bins[name], summary.Count, 95)
		}
		summaries = append(summaries, summary)
	}
	return summaries, nil
}

// GetBehaviorVitalTrend returns daily UTC P50/P95 per vital, ascending by day
// and then by BehaviorVitalNames order. Days without data are omitted.
func GetBehaviorVitalTrend(f BehaviorEventFilter) ([]BehaviorVitalTrendPoint, error) {
	var rows []struct {
		Bucket    int64
		EventName string
		Bin       int64
		Count     int64
	}
	err := f.scope().Where("event_type = ?", "perf_vital").
		Select("created_at - created_at % 86400 AS bucket, event_name, " + behaviorBinExpr + " AS bin, COUNT(*) AS count").
		Group("bucket, event_name, bin").Order("bin ASC").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	type dayVital struct {
		bucket int64
		name   string
	}
	bins := make(map[dayVital][]behaviorBin)
	totals := make(map[dayVital]int64)
	for _, row := range rows {
		k := dayVital{row.Bucket, row.EventName}
		bins[k] = append(bins[k], behaviorBin{row.Bin, row.Count})
		totals[k] += row.Count
	}
	points := make([]BehaviorVitalTrendPoint, 0, len(totals))
	for k, total := range totals {
		points = append(points, BehaviorVitalTrendPoint{
			Ts: k.bucket, Name: k.name, Count: total,
			P50Ms: histogramPercentile(bins[k], total, 50),
			P95Ms: histogramPercentile(bins[k], total, 95),
		})
	}
	slices.SortFunc(points, func(a, b BehaviorVitalTrendPoint) int {
		return cmp.Or(cmp.Compare(a.Ts, b.Ts),
			cmp.Compare(slices.Index(BehaviorVitalNames, a.Name), slices.Index(BehaviorVitalNames, b.Name)))
	})
	return points, nil
}

// GetBehaviorApiErrors returns the top 20 (api_route, status_code) pairs and
// the total api_error count.
func GetBehaviorApiErrors(f BehaviorEventFilter) ([]BehaviorApiErrorItem, int64, error) {
	items := make([]BehaviorApiErrorItem, 0)
	err := f.scope().Where("event_type = ?", "api_error").
		Select("api_route, status_code, COUNT(*) AS count, AVG(duration_ms) AS avg_duration_ms").
		Group("api_route, status_code").Order("count DESC").Order("api_route ASC").Order("status_code ASC").
		Limit(20).Scan(&items).Error
	if err != nil {
		return nil, 0, err
	}
	var total int64
	if err := f.scope().Where("event_type = ?", "api_error").Count(&total).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// GetBehaviorClientErrors returns the top 20 error names and the total.
func GetBehaviorClientErrors(f BehaviorEventFilter) ([]BehaviorClientErrorItem, int64, error) {
	items := make([]BehaviorClientErrorItem, 0)
	err := f.scope().Where("event_type = ?", "client_error").
		Select("error_name, COUNT(*) AS count").
		Group("error_name").Order("count DESC").Order("error_name ASC").Limit(20).Scan(&items).Error
	if err != nil {
		return nil, 0, err
	}
	var total int64
	if err := f.scope().Where("event_type = ?", "client_error").Count(&total).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}
