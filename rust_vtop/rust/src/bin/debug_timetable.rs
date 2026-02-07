use rust_lib_vitapmate::api::vtop_get_client::{
    get_vtop_client,
    vtop_client_login,
    fetch_semesters,
    fetch_timetable,
};

    use std::env;

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 3 {
        eprintln!("Usage: {} <username> <password>", args[0]);
        std::process::exit(1);
    }

    let username = args[1].to_uppercase();
    let password = &args[2];

    eprintln!("Attempting login for user: {}", username);

    let mut client = get_vtop_client(
        username.clone(),
        password.to_string(),
        None,
    );

    let mut retry_count = 0;
    while retry_count < 3 {
        match vtop_client_login(&mut client).await {
            Ok(_) => break, // Success
            Err(e) => {
                retry_count += 1;
                eprintln!("Login attempt {} failed: {:?}", retry_count, e);
                if retry_count >= 3 {
                    let error_msg = format!("{:?}", e);
                    let json_out = serde_json::json!({
                        "error": "Login failed after 3 attempts",
                        "details": error_msg
                    });
                    println!("{}", json_out);
                    std::process::exit(0);
                }
                // Determine if we should recreate the client or just retry
                // For simplicity, we just retry the login call which handles session reset internally usually
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            }
        }
    }

    let semesters = match fetch_semesters(&mut client).await {
        Ok(s) => s,
        Err(e) => {
             let error_msg = format!("{:?}", e);
             let json_out = serde_json::json!({
                 "error": "Failed to fetch semesters",
                 "details": error_msg
             });
             println!("{}", json_out);
             std::process::exit(0);
        }
    };

    if semesters.semesters.is_empty() {
        eprintln!("No semesters found");
        std::process::exit(1);
    }

    let semester_id = if args.len() > 3 {
        args[3].clone()
    } else {
        semesters.semesters[0].id.clone()
    };

    let timetable = match fetch_timetable(&mut client, semester_id).await {
        Ok(t) => t,
        Err(e) => {
             let error_msg = format!("{:?}", e);
             let json_out = serde_json::json!({
                 "error": "Failed to fetch timetable",
                 "details": error_msg
             });
             println!("{}", json_out);
             std::process::exit(0);
        }
    };

    let final_out = serde_json::json!({
        "semesters": semesters,
        "timetable": timetable
    });

    println!("{}", final_out);
}
