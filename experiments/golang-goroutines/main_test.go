package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// setupTestRouter creates an AppState with both worker pools started and
// returns an http.Handler built by newRouter. This mirrors what main() does,
// but without binding a real port — safe to call from every test.
func setupTestRouter() http.Handler {
	state := &AppState{
		workerJobs:  make(chan jobRequest, 1000),
		boundedJobs: make(chan jobRequest, 20),
	}
	for i := 0; i < 4; i++ {
		go worker(state.workerJobs)
		go worker(state.boundedJobs)
	}
	return newRouter(state)
}

// TestHealthHandler verifies GET /health → 200, body {"status":"ok"}.
// Requirements: 3.5
func TestHealthHandler(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var resp HealthResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	if resp.Status != "ok" {
		t.Errorf("expected status field to be 'ok', got %q", resp.Status)
	}
}

// TestComputeGoroutineStrategy verifies GET /compute?strategy=goroutine → 200
// with the correct shape: strategy == "goroutine", duration_ms >= 0,
// goroutine_id non-empty.
// Requirements: 3.6, 3.7
func TestComputeGoroutineStrategy(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/compute?strategy=goroutine", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var resp ComputeResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	if resp.Strategy != "goroutine" {
		t.Errorf("expected strategy 'goroutine', got %q", resp.Strategy)
	}
	if resp.DurationMs < 0 {
		t.Errorf("expected duration_ms >= 0, got %d", resp.DurationMs)
	}
	if resp.GoroutineID == "" {
		t.Error("expected non-empty goroutine_id")
	}
}

// TestComputeWorkerPoolStrategy verifies GET /compute?strategy=workerpool → 200
// with the correct shape.
// Requirements: 3.8
func TestComputeWorkerPoolStrategy(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/compute?strategy=workerpool", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var resp ComputeResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	if resp.Strategy != "workerpool" {
		t.Errorf("expected strategy 'workerpool', got %q", resp.Strategy)
	}
	if resp.DurationMs < 0 {
		t.Errorf("expected duration_ms >= 0, got %d", resp.DurationMs)
	}
	if resp.GoroutineID == "" {
		t.Error("expected non-empty goroutine_id")
	}
}

// TestComputeBoundedStrategy verifies GET /compute?strategy=bounded → 200
// with the correct shape (queue is empty at test time, so no 503).
// Requirements: 3.9
func TestComputeBoundedStrategy(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/compute?strategy=bounded", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var resp ComputeResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	if resp.Strategy != "bounded" {
		t.Errorf("expected strategy 'bounded', got %q", resp.Strategy)
	}
	if resp.DurationMs < 0 {
		t.Errorf("expected duration_ms >= 0, got %d", resp.DurationMs)
	}
	if resp.GoroutineID == "" {
		t.Error("expected non-empty goroutine_id")
	}
}

// TestComputeDefaultStrategy verifies GET /compute (no strategy param) → 200
// and that the response strategy field defaults to "goroutine".
// Requirements: 3.6
func TestComputeDefaultStrategy(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/compute", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var resp ComputeResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	// Omitting the query param must behave identically to strategy=goroutine.
	if resp.Strategy != "goroutine" {
		t.Errorf("expected default strategy 'goroutine', got %q", resp.Strategy)
	}
	if resp.DurationMs < 0 {
		t.Errorf("expected duration_ms >= 0, got %d", resp.DurationMs)
	}
	if resp.GoroutineID == "" {
		t.Error("expected non-empty goroutine_id")
	}
}

// TestComputeInvalidStrategy verifies GET /compute?strategy=invalid → 400
// with an error message listing all three valid strategies.
// Requirements: 3.10
func TestComputeInvalidStrategy(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/compute?strategy=invalid", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rec.Code)
	}

	var resp ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	// The error message must contain all three valid strategy names
	for _, valid := range []string{"goroutine", "workerpool", "bounded"} {
		if !strings.Contains(resp.Error, valid) {
			t.Errorf("expected error message to contain %q, got: %s", valid, resp.Error)
		}
	}
}
