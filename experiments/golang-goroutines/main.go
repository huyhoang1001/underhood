package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"runtime"
	"strings"
	"time"
)

// Success response for /compute
type ComputeResponse struct {
	Strategy    string `json:"strategy"`
	DurationMs  int64  `json:"duration_ms"`
	GoroutineID string `json:"goroutine_id"`
}

// Error response for invalid strategies
type ErrorResponse struct {
	Error string `json:"error"`
}

// Health response
type HealthResponse struct {
	Status string `json:"status"`
}

// Internal job passing — sent to worker goroutines
type jobRequest struct {
	result chan jobResult
}

// Internal result — sent back from worker goroutines
type jobResult struct {
	durationMs  int64
	goroutineID string
}

// Application state — holds the worker pool channels
type AppState struct {
	workerJobs  chan jobRequest // large buffer (1000) – workerpool strategy
	boundedJobs chan jobRequest // small buffer (20) – bounded strategy
}

// goroutineID extracts the current goroutine's ID by parsing the runtime
// stack trace. Go does not expose a goroutine ID in its public API, so the
// idiomatic workaround is to read runtime.Stack and parse the first line,
// which always starts with "goroutine <N> [".
func goroutineID() string {
	var buf [64]byte
	n := runtime.Stack(buf[:], false)
	// first line: "goroutine 42 [running]:"
	s := strings.TrimPrefix(string(buf[:n]), "goroutine ")
	idx := strings.IndexByte(s, ' ')
	if idx < 0 {
		return "unknown"
	}
	return s[:idx]
}

func main() {
	// Log GOMAXPROCS and CPU cores
	fmt.Printf("GOMAXPROCS        : %d\n", runtime.GOMAXPROCS(0))
	fmt.Printf("Logical CPU cores : %d\n", runtime.NumCPU())

	state := &AppState{
		workerJobs:  make(chan jobRequest, 1000), // large buffer for workerpool
		boundedJobs: make(chan jobRequest, 20),   // small buffer for bounded
	}

	// Start 4 worker goroutines for the workerpool strategy
	for i := 0; i < 4; i++ {
		go worker(state.workerJobs)
	}
	// Start 4 worker goroutines for the bounded strategy
	for i := 0; i < 4; i++ {
		go worker(state.boundedJobs)
	}

	router := newRouter(state)

	fmt.Println("Listening on http://0.0.0.0:3000")
	log.Fatal(http.ListenAndServe(":3000", router))
}

// worker drains a job channel, runs the blocking work, and sends back the
// result. It runs in its own goroutine and blocks on channel receive while
// idle, so it consumes no CPU until a job arrives.
func worker(jobs <-chan jobRequest) {
	for req := range jobs {
		start := time.Now()
		runBlockingWork()
		req.result <- jobResult{
			durationMs:  time.Since(start).Milliseconds(),
			goroutineID: goroutineID(),
		}
	}
}

// newRouter builds the HTTP router with the /health and /compute routes.
// Extracted as a helper so tests can spin up the server with httptest
// without binding a real port.
func newRouter(state *AppState) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/compute", func(w http.ResponseWriter, r *http.Request) {
		computeHandler(w, r, state)
	})
	return mux
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(HealthResponse{Status: "ok"})
}

func computeHandler(w http.ResponseWriter, r *http.Request, state *AppState) {
	strategy := r.URL.Query().Get("strategy")
	if strategy == "" {
		strategy = "goroutine" // default
	}

	switch strategy {
	case "goroutine":
		start := time.Now()
		runBlockingWork()
		durationMs := time.Since(start).Milliseconds()
		gid := goroutineID()
		csvLog(strategy, durationMs)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ComputeResponse{
			Strategy:    strategy,
			DurationMs:  durationMs,
			GoroutineID: gid,
		})
	case "workerpool":
		req := jobRequest{result: make(chan jobResult, 1)}
		state.workerJobs <- req
		res := <-req.result // block on channel receive — not a spin or sleep
		csvLog(strategy, res.durationMs)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ComputeResponse{
			Strategy:    strategy,
			DurationMs:  res.durationMs,
			GoroutineID: res.goroutineID,
		})
	case "bounded":
		req := jobRequest{result: make(chan jobResult, 1)}
		select {
		case state.boundedJobs <- req: // non-blocking send — dispatched to worker
			res := <-req.result // block on channel receive — not a spin
			csvLog(strategy, res.durationMs)
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(ComputeResponse{
				Strategy:    strategy,
				DurationMs:  res.durationMs,
				GoroutineID: res.goroutineID,
			})
		default: // channel is full — return 503
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(ErrorResponse{Error: "Server overloaded: job queue full"})
		}
	default:
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(ErrorResponse{
			Error: fmt.Sprintf("Unknown strategy '%s'. Valid values: goroutine, workerpool, bounded", strategy),
		})
	}
}

// runBlockingWork simulates CPU-bound work by spinning in a tight loop
// until 100 ms of wall-clock time has elapsed. It does not call any
// function that would yield the goroutine, so it holds the P it runs on.
func runBlockingWork() {
	start := time.Now()
	deadline := start.Add(100 * time.Millisecond)
	for time.Now().Before(deadline) {
		// tight loop — no yield point, no I/O, no channel op
	}
}

// csvLog writes a single CSV line to stdout: strategy,timestamp_ms,duration_ms
func csvLog(strategy string, durationMs int64) {
	fmt.Printf("%s,%d,%d\n", strategy, timestampMs(), durationMs)
}

// timestampMs returns the current Unix epoch time in milliseconds.
func timestampMs() int64 {
	return time.Now().UnixMilli()
}
