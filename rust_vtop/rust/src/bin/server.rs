use axum::{
    extract::Json,
    routing::post,
    Router,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};
use std::net::SocketAddr;
use rust_lib_vitapmate::api::vtop_get_client::{
    get_vtop_client,
    vtop_client_login,
    fetch_semesters,
    fetch_timetable,
};

#[derive(Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
    #[serde(rename = "semesterId")]
    semester_id: Option<String>,
}

#[derive(Serialize)]
struct LoginResponse {
    success: bool,
    faculty: Vec<Faculty>,
    semesters: Vec<Semester>,
}

#[derive(Serialize)]
struct Faculty {
    #[serde(rename = "cabinId")]
    cabin_id: String,
    name: String,
}

#[derive(Serialize)]
struct Semester {
    id: String,
    name: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    details: Option<String>,
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/vtop-login", post(handle_login))
        .layer(cors);

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse()
        .expect("PORT must be a number");
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Server running on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn handle_login(
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, Json<ErrorResponse>)> {
    let username = payload.username.to_uppercase();
    let password = payload.password;

    let mut client = get_vtop_client(username.clone(), password, None);

    // Login with retries
    let mut retry_count = 0;
    while retry_count < 3 {
        match vtop_client_login(&mut client).await {
            Ok(_) => break,
            Err(e) if retry_count < 2 => {
                retry_count += 1;
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            }
            Err(e) => {
                return Err((
                    StatusCode::UNAUTHORIZED,
                    Json(ErrorResponse {
                        error: "Login failed".to_string(),
                        details: Some(format!("{:?}", e)),
                    }),
                ));
            }
        }
    }

    // Fetch Semesters
    let semesters_data = fetch_semesters(&mut client).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "Failed to fetch semesters".to_string(),
                details: Some(format!("{:?}", e)),
            }),
        )
    })?;

    if semesters_data.semesters.is_empty() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "No semesters found".to_string(),
                details: None,
            }),
        ));
    }

    let semester_id = payload.semester_id.unwrap_or_else(|| semesters_data.semesters[0].id.clone());

    // Fetch Timetable
    let timetable = fetch_timetable(&mut client, semester_id).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "Failed to fetch timetable".to_string(),
                details: Some(format!("{:?}", e)),
            }),
        )
    })?;

    // Extract Faculty
    let mut faculty_map = std::collections::HashMap::new();
    for slot in timetable.slots {
        if !slot.faculty.trim().is_empty() {
            let cabin_id = if !slot.room_no.trim().is_empty() {
                slot.room_no
            } else {
                format!("UNKNOWN-{}", slot.faculty.replace(' ', "-"))
            };
            if !faculty_map.contains_key(&cabin_id) {
                faculty_map.insert(
                    cabin_id.clone(),
                    Faculty {
                        cabin_id,
                        name: slot.faculty,
                    },
                );
            }
        }
    }

    Ok(Json(LoginResponse {
        success: true,
        faculty: faculty_map.into_values().collect(),
        semesters: semesters_data
            .semesters
            .into_iter()
            .map(|s| Semester { id: s.id, name: s.name })
            .collect(),
    }))
}
