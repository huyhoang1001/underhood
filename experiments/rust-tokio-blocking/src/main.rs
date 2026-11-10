use axum::{extract::Query, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;

// --- Types ---

#[derive(Deserialize)]
struct ComputeParams {
    strategy: Option<String>,
}

#[derive(Serialize)]
struct ComputeResponse {
    strategy: String,
    duration_ms: u64,
    thread_id: String,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

struct AppState {
    semaphore: Semaphore,
}

// --- main (task 2.2) ---

#[tokio::main]
async fn main() {
    let worker_threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1);
    println!("Tokio worker threads  : {}", worker_threads);
    println!("Tokio blocking threads: up to 512 (Tokio default ceiling)");
    println!("Listening on http://0.0.0.0:3000");

    let app = build_router();

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// Build the router separately for testability (task 2.8 prerequisite)
fn build_router() -> Router {
    let state = Arc::new(AppState {
        semaphore: Semaphore::new(4),
    });

    Router::new()
        .route("/health", get(health_handler))
        .route("/compute", get(compute_handler))
        .with_state(state)
}

// --- Handlers ---

// task 2.3
async fn health_handler() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

// tasks 2.4, 2.5, 2.6, 2.7
async fn compute_handler(
    Query(params): Query<ComputeParams>,
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> Result<Json<ComputeResponse>, (axum::http::StatusCode, Json<ErrorResponse>)> {
    let strategy = params.strategy.as_deref().unwrap_or("blocking");

    match strategy {
        // task 2.4: blocking strategy
        "blocking" => {
            let thread_id = format!("{:?}", std::thread::current().id());
            let start = Instant::now();
            run_blocking_work();
            let duration_ms = start.elapsed().as_millis() as u64;
            println!("blocking,{},{}", current_timestamp_ms(), duration_ms);
            Ok(Json(ComputeResponse {
                strategy: "blocking".into(),
                duration_ms,
                thread_id,
            }))
        }
        // task 2.5: spawn_blocking strategy
        "spawn_blocking" => {
            let start = Instant::now();
            let (duration_ms, thread_id) = tokio::task::spawn_blocking(|| {
                let inner_start = Instant::now();
                let tid = format!("{:?}", std::thread::current().id());
                run_blocking_work();
                (inner_start.elapsed().as_millis() as u64, tid)
            })
            .await
            .unwrap();
            let wall_ms = start.elapsed().as_millis() as u64;
            println!("spawn_blocking,{},{}", current_timestamp_ms(), wall_ms);
            Ok(Json(ComputeResponse {
                strategy: "spawn_blocking".into(),
                duration_ms,
                thread_id,
            }))
        }
        // task 2.6: bounded strategy
        "bounded" => {
            let permit =
                tokio::time::timeout(Duration::from_secs(30), state.semaphore.acquire()).await;

            let permit = match permit {
                Ok(Ok(p)) => p,
                _ => {
                    return Err((
                        axum::http::StatusCode::SERVICE_UNAVAILABLE,
                        Json(ErrorResponse {
                            error: "Server overloaded: semaphore permit not acquired within 30s"
                                .into(),
                        }),
                    ));
                }
            };

            let start = Instant::now();
            let (duration_ms, thread_id) = tokio::task::spawn_blocking(|| {
                let inner_start = Instant::now();
                let tid = format!("{:?}", std::thread::current().id());
                run_blocking_work();
                (inner_start.elapsed().as_millis() as u64, tid)
            })
            .await
            .unwrap();
            drop(permit);
            let wall_ms = start.elapsed().as_millis() as u64;
            println!("bounded,{},{}", current_timestamp_ms(), wall_ms);
            Ok(Json(ComputeResponse {
                strategy: "bounded".into(),
                duration_ms,
                thread_id,
            }))
        }
        // task 2.7: unknown strategy → 400
        other => Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!(
                    "Unknown strategy '{}'. Valid values: blocking, spawn_blocking, bounded",
                    other
                ),
            }),
        )),
    }
}

// task 2.7: shared busy-wait and helpers
fn run_blocking_work() {
    let deadline = Instant::now() + Duration::from_millis(100);
    let mut _x: u64 = 0;
    while Instant::now() < deadline {
        _x = _x.wrapping_add(1);
    }
}

fn current_timestamp_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    // --- task 4.1 tests ---

    #[tokio::test]
    async fn health_returns_200_with_ok_body() {
        let app = build_router();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), axum::http::StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["status"], "ok");
    }

    #[tokio::test]
    async fn compute_blocking_returns_200_with_required_fields() {
        let app = build_router();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/compute?strategy=blocking")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), axum::http::StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["strategy"], "blocking");
        assert!(json["duration_ms"].as_u64().is_some());
        assert!(!json["thread_id"].as_str().unwrap_or("").is_empty());
    }

    #[tokio::test]
    async fn compute_spawn_blocking_returns_200_with_required_fields() {
        let app = build_router();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/compute?strategy=spawn_blocking")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), axum::http::StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["strategy"], "spawn_blocking");
        assert!(json["duration_ms"].is_number());
        assert!(!json["thread_id"].as_str().unwrap_or("").is_empty());
    }

    #[tokio::test]
    async fn compute_bounded_returns_200_with_required_fields() {
        let app = build_router();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/compute?strategy=bounded")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), axum::http::StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["strategy"], "bounded");
        assert!(json["duration_ms"].is_number());
        assert!(!json["thread_id"].as_str().unwrap_or("").is_empty());
    }

    #[tokio::test]
    async fn compute_no_param_defaults_to_blocking() {
        let app = build_router();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/compute")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), axum::http::StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["strategy"], "blocking");
    }

    // --- task 4.2 test ---

    #[tokio::test]
    async fn compute_invalid_strategy_returns_400_with_valid_values() {
        let app = build_router();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/compute?strategy=invalid")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), axum::http::StatusCode::BAD_REQUEST);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        let error_msg = json["error"].as_str().unwrap_or("");
        assert!(error_msg.contains("blocking"), "error should mention 'blocking'");
        assert!(
            error_msg.contains("spawn_blocking"),
            "error should mention 'spawn_blocking'"
        );
        assert!(error_msg.contains("bounded"), "error should mention 'bounded'");
    }
}
