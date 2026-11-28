package service

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

const (
	analyticsQueueSize      = 4096
	analyticsFlushBatchSize = 100
	analyticsFlushInterval  = 2 * time.Second
	analyticsDropLogEvery   = 30 * time.Second
)

var (
	analyticsQueue       = make(chan *model.BehaviorEvent, analyticsQueueSize)
	analyticsWriterMutex sync.Mutex
	analyticsWriterDone  chan struct{}
	analyticsWriterStop  chan struct{}
	analyticsLastDropLog atomic.Int64
)

// EnqueueBehaviorEvents queues events without blocking and returns how many
// were dropped because the queue was full.
func EnqueueBehaviorEvents(events []*model.BehaviorEvent) (dropped int) {
	for _, event := range events {
		select {
		case analyticsQueue <- event:
		default:
			dropped++
		}
	}
	if dropped > 0 {
		now := time.Now().UnixNano()
		last := analyticsLastDropLog.Load()
		if now-last >= int64(analyticsDropLogEvery) && analyticsLastDropLog.CompareAndSwap(last, now) {
			common.SysError(common.LogText("analytics queue is full, dropped %d events", dropped))
		}
	}
	return dropped
}

// StartAnalyticsWriter starts the background batch writer. It is idempotent.
func StartAnalyticsWriter() {
	analyticsWriterMutex.Lock()
	defer analyticsWriterMutex.Unlock()
	if analyticsWriterDone != nil {
		return
	}
	stop := make(chan struct{})
	done := make(chan struct{})
	analyticsWriterStop, analyticsWriterDone = stop, done
	go runAnalyticsWriter(stop, done)
}

// StopAnalyticsWriter stops the writer and flushes the queue, bounded by ctx
// and a 5-second timeout.
func StopAnalyticsWriter(ctx context.Context) {
	analyticsWriterMutex.Lock()
	stop, done := analyticsWriterStop, analyticsWriterDone
	analyticsWriterStop, analyticsWriterDone = nil, nil
	analyticsWriterMutex.Unlock()
	if done == nil {
		return
	}
	close(stop)
	timer := time.NewTimer(5 * time.Second)
	defer timer.Stop()
	select {
	case <-done:
	case <-timer.C:
	case <-ctx.Done():
	}
}

func runAnalyticsWriter(stop <-chan struct{}, done chan<- struct{}) {
	defer close(done)
	batch := make([]*model.BehaviorEvent, 0, analyticsFlushBatchSize)
	flush := func() {
		if len(batch) == 0 {
			return
		}
		if err := model.InsertBehaviorEvents(batch); err != nil {
			common.SysError(common.LogText("failed to write behavior events: %s", err.Error()))
		}
		batch = batch[:0]
	}
	ticker := time.NewTicker(analyticsFlushInterval)
	defer ticker.Stop()
	for {
		select {
		case event := <-analyticsQueue:
			batch = append(batch, event)
			if len(batch) >= analyticsFlushBatchSize {
				flush()
			}
		case <-ticker.C:
			flush()
		case <-stop:
			for {
				select {
				case event := <-analyticsQueue:
					batch = append(batch, event)
					if len(batch) >= analyticsFlushBatchSize {
						flush()
					}
				default:
					flush()
					return
				}
			}
		}
	}
}
