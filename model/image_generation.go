package model

import (
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
)

// imageGenerationTagsCache 缓存 GetImageGenerationTags 的聚合结果，
// 避免每次公开请求都对 ImageGenerationTemplate 全表扫描 + JSON 解析。
var (
	imageGenerationTagsCache      []map[string]interface{}
	imageGenerationTagsCacheAt    int64
	imageGenerationTagsCacheMutex sync.RWMutex
)

const imageGenerationTagsCacheTTL int64 = 60 // 秒

type ImageGenerationTemplate struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	Title       string `json:"title" gorm:"not null;index"`
	Description string `json:"description" gorm:"type:text"`
	Prompt      string `json:"prompt" gorm:"type:text;not null"`
	ImageUrl    string `json:"image_url" gorm:"not null"`
	ImageUrls   string `json:"image_urls" gorm:"type:text"` // JSON 数组字符串
	Tags        string `json:"tags" gorm:"type:text"`       // JSON 数组字符串
	Sort        int    `json:"sort" gorm:"default:0;index"`
	Visible     bool   `json:"visible" gorm:"not null;default:true;index"`
	CreatedAt   int64  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   int64  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (t *ImageGenerationTemplate) TableName() string {
	return "image_generation_templates"
}

func (t *ImageGenerationTemplate) GetTagList() []string {
	if t.Tags == "" {
		return []string{}
	}
	var tags []string
	_ = common.Unmarshal([]byte(t.Tags), &tags)
	return tags
}

func (t *ImageGenerationTemplate) GetImageUrlList() []string {
	if t.ImageUrls == "" {
		if t.ImageUrl != "" {
			return []string{t.ImageUrl}
		}
		return []string{}
	}
	var urls []string
	_ = common.Unmarshal([]byte(t.ImageUrls), &urls)
	if len(urls) == 0 && t.ImageUrl != "" {
		return []string{t.ImageUrl}
	}
	return urls
}

type ImageGenerationTemplateListItem struct {
	Id            int      `json:"id"`
	Title         string   `json:"title"`
	Description   string   `json:"description"`
	PromptExcerpt string   `json:"prompt_excerpt"`
	ImageUrl      string   `json:"image_url"`
	ImageUrls     []string `json:"image_urls"`
	Tags          []string `json:"tags"`
	CreatedAt     int64    `json:"created_at"`
	UpdatedAt     int64    `json:"updated_at"`
}

type ImageGenerationTemplateDetail struct {
	Id          int      `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Prompt      string   `json:"prompt"`
	ImageUrl    string   `json:"image_url"`
	ImageUrls   []string `json:"image_urls"`
	Tags        []string `json:"tags"`
	CreatedAt   int64    `json:"created_at"`
	UpdatedAt   int64    `json:"updated_at"`
}

func (t *ImageGenerationTemplate) ToListItem() ImageGenerationTemplateListItem {
	excerpt := t.Prompt
	if len([]rune(excerpt)) > 120 {
		runes := []rune(excerpt)
		excerpt = string(runes[:120]) + "..."
	}
	return ImageGenerationTemplateListItem{
		Id:            t.Id,
		Title:         t.Title,
		Description:   t.Description,
		PromptExcerpt: excerpt,
		ImageUrl:      t.ImageUrl,
		ImageUrls:     t.GetImageUrlList(),
		Tags:          t.GetTagList(),
		CreatedAt:     t.CreatedAt,
		UpdatedAt:     t.UpdatedAt,
	}
}

func (t *ImageGenerationTemplate) ToDetail() ImageGenerationTemplateDetail {
	return ImageGenerationTemplateDetail{
		Id:          t.Id,
		Title:       t.Title,
		Description: t.Description,
		Prompt:      t.Prompt,
		ImageUrl:    t.ImageUrl,
		ImageUrls:   t.GetImageUrlList(),
		Tags:        t.GetTagList(),
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
	}
}

// ImageGenerationTemplateExportItem 是导出/导入交换格式，数组字段以数组形式呈现，便于人读与表格转换。
type ImageGenerationTemplateExportItem struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Prompt      string   `json:"prompt"`
	ImageUrl    string   `json:"image_url"`
	ImageUrls   []string `json:"image_urls"`
	Tags        []string `json:"tags"`
	Sort        int      `json:"sort"`
	Visible     bool     `json:"visible"`
}

func (t *ImageGenerationTemplate) ToExportItem() ImageGenerationTemplateExportItem {
	return ImageGenerationTemplateExportItem{
		Title:       t.Title,
		Description: t.Description,
		Prompt:      t.Prompt,
		ImageUrl:    t.ImageUrl,
		ImageUrls:   t.GetImageUrlList(),
		Tags:        t.GetTagList(),
		Sort:        t.Sort,
		Visible:     t.Visible,
	}
}

func GetImageGenerationTags() ([]map[string]interface{}, error) {
	now := time.Now().Unix()

	imageGenerationTagsCacheMutex.RLock()
	if imageGenerationTagsCache != nil && now-imageGenerationTagsCacheAt < imageGenerationTagsCacheTTL {
		cached := imageGenerationTagsCache
		imageGenerationTagsCacheMutex.RUnlock()
		return cached, nil
	}
	imageGenerationTagsCacheMutex.RUnlock()

	imageGenerationTagsCacheMutex.Lock()
	defer imageGenerationTagsCacheMutex.Unlock()
	// double-check：避免多个 goroutine 同时穿透到 DB
	if imageGenerationTagsCache != nil && now-imageGenerationTagsCacheAt < imageGenerationTagsCacheTTL {
		return imageGenerationTagsCache, nil
	}

	var templates []ImageGenerationTemplate
	if err := DB.Where("visible = ?", true).Select("tags").Find(&templates).Error; err != nil {
		return nil, err
	}

	tagCount := make(map[string]int)
	for _, t := range templates {
		for _, tag := range t.GetTagList() {
			tag = strings.TrimSpace(tag)
			if tag != "" {
				tagCount[tag]++
			}
		}
	}

	result := make([]map[string]interface{}, 0, len(tagCount))
	for name, count := range tagCount {
		result = append(result, map[string]interface{}{
			"name":  name,
			"count": count,
		})
	}

	imageGenerationTagsCache = result
	imageGenerationTagsCacheAt = now
	return result, nil
}

// InvalidateImageGenerationTagsCache 在模板增删改后立即过期 tags 缓存。
// 没有调用方时也无害，仅会让下一次 Get 走 DB。
func InvalidateImageGenerationTagsCache() {
	imageGenerationTagsCacheMutex.Lock()
	imageGenerationTagsCache = nil
	imageGenerationTagsCacheAt = 0
	imageGenerationTagsCacheMutex.Unlock()
}

func GetImageGenerationTemplates(keyword, tag string, page, pageSize int) ([]ImageGenerationTemplate, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 60 {
		pageSize = 24
	}

	query := DB.Model(&ImageGenerationTemplate{}).Where("visible = ?", true)

	if keyword != "" {
		like := "%" + escapeLikePattern(keyword) + "%"
		query = query.Where(
			"title LIKE ? ESCAPE '!' OR description LIKE ? ESCAPE '!' OR prompt LIKE ? ESCAPE '!' OR tags LIKE ? ESCAPE '!'",
			like, like, like, like)
	}

	if tag != "" {
		// tags 字段以 JSON 数组字符串存储（如 `["art","abstract"]`），
		// 用带双引号的 LIKE 模式精确匹配 tag 边界，避免 "art" 误命中 "abstract"。
		tagLike := `%"` + escapeLikePattern(tag) + `"%`
		query = query.Where("tags LIKE ? ESCAPE '!'", tagLike)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var templates []ImageGenerationTemplate
	offset := (page - 1) * pageSize
	if err := query.Order("sort DESC, id DESC").Offset(offset).Limit(pageSize).Find(&templates).Error; err != nil {
		return nil, 0, err
	}

	return templates, total, nil
}

func GetImageGenerationTemplateById(id int) (*ImageGenerationTemplate, error) {
	var template ImageGenerationTemplate
	if err := DB.Where("id = ? AND visible = ?", id, true).First(&template).Error; err != nil {
		return nil, err
	}
	return &template, nil
}

// Admin-only functions

func AdminGetImageGenerationTemplates(keyword string, page, pageSize int) ([]ImageGenerationTemplate, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := DB.Model(&ImageGenerationTemplate{})
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("title LIKE ? OR description LIKE ? OR prompt LIKE ?", like, like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var templates []ImageGenerationTemplate
	offset := (page - 1) * pageSize
	if err := query.Order("sort DESC, id DESC").Offset(offset).Limit(pageSize).Find(&templates).Error; err != nil {
		return nil, 0, err
	}
	return templates, total, nil
}

func AdminGetImageGenerationTemplateById(id int) (*ImageGenerationTemplate, error) {
	var template ImageGenerationTemplate
	if err := DB.First(&template, id).Error; err != nil {
		return nil, err
	}
	return &template, nil
}

type ImageGenerationTemplateInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Prompt      string `json:"prompt"`
	ImageUrl    string `json:"image_url"`
	ImageUrls   string `json:"image_urls"`
	Tags        string `json:"tags"`
	Sort        int    `json:"sort"`
	Visible     bool   `json:"visible"`
}

func AdminCreateImageGenerationTemplate(input *ImageGenerationTemplateInput) (*ImageGenerationTemplate, error) {
	t := &ImageGenerationTemplate{
		Title:       input.Title,
		Description: input.Description,
		Prompt:      input.Prompt,
		ImageUrl:    input.ImageUrl,
		ImageUrls:   input.ImageUrls,
		Tags:        input.Tags,
		Sort:        input.Sort,
		Visible:     input.Visible,
	}
	if err := DB.Create(t).Error; err != nil {
		return nil, err
	}
	InvalidateImageGenerationTagsCache()
	return t, nil
}

func AdminUpdateImageGenerationTemplate(id int, input *ImageGenerationTemplateInput) (*ImageGenerationTemplate, error) {
	t := &ImageGenerationTemplate{}
	if err := DB.First(t, id).Error; err != nil {
		return nil, err
	}
	t.Title = input.Title
	t.Description = input.Description
	t.Prompt = input.Prompt
	t.ImageUrl = input.ImageUrl
	t.ImageUrls = input.ImageUrls
	t.Tags = input.Tags
	t.Sort = input.Sort
	t.Visible = input.Visible
	if err := DB.Save(t).Error; err != nil {
		return nil, err
	}
	InvalidateImageGenerationTagsCache()
	return t, nil
}

func AdminDeleteImageGenerationTemplate(id int) error {
	if err := DB.Delete(&ImageGenerationTemplate{}, id).Error; err != nil {
		return err
	}
	InvalidateImageGenerationTagsCache()
	return nil
}

// AdminExportAllImageGenerationTemplates 返回全部模板（不分页、不过滤 visible），用于导出。
func AdminExportAllImageGenerationTemplates() ([]ImageGenerationTemplate, error) {
	var templates []ImageGenerationTemplate
	if err := DB.Order("sort DESC, id DESC").Find(&templates).Error; err != nil {
		return nil, err
	}
	return templates, nil
}

// AdminBatchCreateImageGenerationTemplates 批量创建模板（忽略传入 ID，全部作为新记录）。
// title / prompt / image_url 任一为空的行会被跳过。返回成功创建的条数。
// 整体包裹在事务内：任意一条失败即回滚已写入的全部行，避免脏数据。
func AdminBatchCreateImageGenerationTemplates(inputs []ImageGenerationTemplateInput) (int, error) {
	imported := 0
	err := DB.Transaction(func(tx *gorm.DB) error {
		for i := range inputs {
			input := inputs[i]
			if strings.TrimSpace(input.Title) == "" ||
				strings.TrimSpace(input.Prompt) == "" ||
				strings.TrimSpace(input.ImageUrl) == "" {
				continue
			}
			t := &ImageGenerationTemplate{
				Title:       input.Title,
				Description: input.Description,
				Prompt:      input.Prompt,
				ImageUrl:    input.ImageUrl,
				ImageUrls:   input.ImageUrls,
				Tags:        input.Tags,
				Sort:        input.Sort,
				Visible:     input.Visible,
			}
			if err := tx.Create(t).Error; err != nil {
				return err
			}
			imported++
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	if imported > 0 {
		InvalidateImageGenerationTagsCache()
	}
	return imported, nil
}

// escapeLikePattern 转义 SQL LIKE 模式中的元字符（% 和 _），
// 防止用户输入污染搜索范围。
// 使用 ! 作为 ESCAPE 字符，与 model/token.go 中 sanitizeLikePattern 的约定一致——
// 避免 MySQL 字符串字面量中反斜杠的二次转义歧义。
// 调用方必须配套使用 `LIKE ? ESCAPE '!'`。
func escapeLikePattern(s string) string {
	s = strings.ReplaceAll(s, "!", "!!")
	s = strings.ReplaceAll(s, "%", "!%")
	s = strings.ReplaceAll(s, "_", "!_")
	return s
}
