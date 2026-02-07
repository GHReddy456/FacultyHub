pub use super::types::*;
pub use super::{
    paraser::*,
    session_manager::SessionManager,
    types::{AttendanceData, ExamScheduleData, FullAttendanceData},
    vtop_config::VtopConfig,
    vtop_errors::{VtopError, VtopResult},
};
use base64::{engine::general_purpose::URL_SAFE, Engine as _};

#[cfg(not(target_arch = "wasm32"))]
pub use reqwest::cookie::{CookieStore, Jar};
use reqwest::{
    header::{HeaderMap, HeaderValue, USER_AGENT},
    multipart, Client, Url,
};

use scraper::{Html, Selector};
use serde::Serialize;
use std::sync::Arc;

pub struct VtopClient {
    client: Client,
    config: VtopConfig,
    session: SessionManager,
    current_page: Option<String>,
    username: String,
    password: String,
    captcha_data: Option<String>,
}

impl VtopClient {
    #[cfg(not(target_arch = "wasm32"))]
    pub async fn get_cookie(&self, check: bool) -> VtopResult<Vec<u8>> {
        if !self.session.is_authenticated() && check {
            return Err(VtopError::SessionExpired);
        }

        let mut data = vec![];
        let url = format!("{}/vtop", self.config.base_url);
        let k = self
            .session
            .get_cookie_store()
            .cookies(&Url::parse(&url).unwrap());
        if let Some(cookie) = k {
            data = cookie.as_bytes().to_vec();
        }
        Ok(data)
    }

    pub fn set_cookie(&mut self, cookie: String) {
        let url = format!("{}/vtop", self.config.base_url);

        self.session.set_cookie_from_external(url, cookie);
    }
    pub async fn get_semesters(&mut self, check: bool) -> VtopResult<SemesterData> {
        if !self.session.is_authenticated() && check {
            return Err(VtopError::SessionExpired);
        }
        let url = format!(
            "{}/vtop/academics/common/StudentTimeTable",
            self.config.base_url
        );

        let body = format!(
            "verifyMenu=true&authorizedID={}&_csrf={}&nocache=@(new Date().getTime())",
            self.username,
            self.session
                .get_csrf_token()
                .ok_or(VtopError::SessionExpired)?,
        );
        let res = self
            .client
            .post(url)
            .body(body)
            .send()
            .await
            .map_err(|_| VtopError::NetworkError)?;
        if !res.status().is_success() || res.url().to_string().contains("login") {
            self.session.set_authenticated(false);
            return Err(VtopError::SessionExpired);
        }

        let text = res.text().await.map_err(|_| VtopError::VtopServerError)?;
        Ok(parsett::parse_semid_timetable(text))
    }

    pub async fn get_timetable(&mut self, semester_id: &str) -> VtopResult<TimetableData> {
        if !self.session.is_authenticated() {
            return Err(VtopError::SessionExpired);
        }
        let url = format!("{}/vtop/processViewTimeTable", self.config.base_url);
        let body = format!(
            "_csrf={}&semesterSubId={}&authorizedID={}",
            self.session
                .get_csrf_token()
                .ok_or(VtopError::SessionExpired)?,
            semester_id,
            self.username
        );
        let res = self
            .client
            .post(url)
            .body(body)
            .send()
            .await
            .map_err(|_| VtopError::NetworkError)?;
        if !res.status().is_success() || res.url().to_string().contains("login") {
            self.session.set_authenticated(false);
            return Err(VtopError::SessionExpired);
        }
        let text = res.text().await.map_err(|_| VtopError::VtopServerError)?;
        Ok(parsett::parse_timetable(text, semester_id))
    }

    pub async fn get_attendance(&mut self, semester_id: &str) -> VtopResult<AttendanceData> {
        if !self.session.is_authenticated() {
            return Err(VtopError::SessionExpired);
        }
        let url = format!("{}/vtop/processViewStudentAttendance", self.config.base_url);
        let body = format!(
            "_csrf={}&semesterSubId={}&authorizedID={}",
            self.session
                .get_csrf_token()
                .ok_or(VtopError::SessionExpired)?,
            semester_id,
            self.username
        );
        let res = self
            .client
            .post(url)
            .body(body)
            .send()
            .await
            .map_err(|_| VtopError::NetworkError)?;
        if !res.status().is_success() || res.url().to_string().contains("login") {
            self.session.set_authenticated(false);
            return Err(VtopError::SessionExpired);
        };
        let text = res.text().await.map_err(|_| VtopError::VtopServerError)?;
        Ok(parseattn::parse_attendance(text, semester_id.to_string()))
    }

    pub async fn get_full_attendance(
        &mut self,
        semester_id: &str,
        course_id: &str,
        course_type: &str,
    ) -> VtopResult<FullAttendanceData> {
        if !self.session.is_authenticated() {
            return Err(VtopError::SessionExpired);
        }
        let url = format!("{}/vtop/processViewAttendanceDetail", self.config.base_url);
        let body = format!(
            "_csrf={}&semesterSubId={}&registerNumber={}&courseId={}&courseType={}&authorizedID={}",
            self.session
                .get_csrf_token()
                .ok_or(VtopError::SessionExpired)?,
            semester_id,
            self.username,
            course_id,
            course_type,
            self.username
        );
        let res = self
            .client
            .post(url)
            .body(body)
            .send()
            .await
            .map_err(|_| VtopError::NetworkError)?;
        if !res.status().is_success() || res.url().to_string().contains("login") {
            self.session.set_authenticated(false);
            return Err(VtopError::SessionExpired);
        }
        let text = res.text().await.map_err(|_| VtopError::VtopServerError)?;
        Ok(parseattn::parse_full_attendance(
            text,
            semester_id.to_string(),
            course_id.into(),
            course_type.into(),
        ))
    }

    pub async fn get_marks(&mut self, semester_id: &str) -> VtopResult<MarksData> {
        if !self.session.is_authenticated() {
            return Err(VtopError::SessionExpired);
        }
        let url = format!(
            "{}/vtop/examinations/doStudentMarkView",
            self.config.base_url
        );
        let form = multipart::Form::new()
            .text("authorizedID", self.username.clone())
            .text("semesterSubId", semester_id.to_string())
            .text(
                "_csrf",
                self.session
                    .get_csrf_token()
                    .ok_or(VtopError::SessionExpired)?,
            );

        let res = self
            .client
            .post(url)
            .multipart(form)
            .send()
            .await
            .map_err(|_| VtopError::NetworkError)?;
        if !res.status().is_success() || res.url().to_string().contains("login") {
            self.session.set_authenticated(false);
            return Err(VtopError::SessionExpired);
        }

        let text = res.text().await.map_err(|_| VtopError::VtopServerError)?;

        Ok(parsemarks::parse_marks(text, semester_id.to_string()))
    }

    pub async fn get_exam_schedule(&mut self, semester_id: &str) -> VtopResult<ExamScheduleData> {
        if !self.session.is_authenticated() {
            return Err(VtopError::SessionExpired);
        }
        let url = format!(
            "{}/vtop/examinations/doSearchExamScheduleForStudent",
            self.config.base_url
        );
        let form = multipart::Form::new()
            .text("authorizedID", self.username.clone())
            .text("semesterSubId", semester_id.to_string())
            .text(
                "_csrf",
                self.session
                    .get_csrf_token()
                    .ok_or(VtopError::SessionExpired)?,
            );
        let res = self
            .client
            .post(url)
            .multipart(form)
            .send()
            .await
            .map_err(|_| VtopError::NetworkError)?;
        if !res.status().is_success() || res.url().to_string().contains("login") {
            self.session.set_authenticated(false);
            return Err(VtopError::SessionExpired);
        }
        let text = res.text().await.map_err(|_| VtopError::VtopServerError)?;
        Ok(parsesched::parse_schedule(text, semester_id.to_string()))
    }
    pub fn is_authenticated(&mut self) -> bool {
        self.session.is_authenticated()
    }
}
// for login
impl VtopClient {
    pub async fn login(&mut self) -> VtopResult<()> {
        if self.session.is_cookie_external() {
            let cookie = self.get_cookie(false).await;
            match cookie {
                Ok(value_of_cookie) => {
                    if !value_of_cookie.is_empty() {
                        if self.get_csrf_for_cookie_set().await.is_ok() {
                            self.session.set_authenticated(true);
                            self.session.set_cookie_external(false);
                            return Ok(());
                        }
                        self.session.set_authenticated(false);
                    }
                    self.session.set_cookie_external(false);
                }
                Err(_e) => {
                    self.session.set_cookie_external(false);
                }
            }
        }

        #[allow(non_snake_case)]
        let MAX_CAP_TRY = 4;
        for i in 0..MAX_CAP_TRY {
            if i == 0 {
                self.load_login_page(true).await?;
            } else {
                self.load_login_page(false).await?;
            }

            let captcha_answer = if let Some(captcha_data) = &self.captcha_data {
                self.solve_captcha(captcha_data).await?
            } else {
                return Err(VtopError::CaptchaRequired);
            };
            match self.perform_login(&captcha_answer).await {
                Ok(_) => {
                    self.session.set_authenticated(true);
                    return Ok(());
                }
                Err(VtopError::AuthenticationFailed(msg)) if msg.contains("Invalid Captcha") => {
                    continue;
                }
                Err(e) => return Err(e),
            }
        }
        Err(VtopError::AuthenticationFailed(
            "Max login attempts exceeded".to_string(),
        ))
    }
    async fn get_csrf_for_cookie_set(&mut self) -> VtopResult<()> {
        let url = format!("{}/vtop/open/page", self.config.base_url);
        let response = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|_| VtopError::NetworkError)?;

        if !response.status().is_success() || response.url().to_string().contains("login") {
            return Err(VtopError::VtopServerError);
        }
        self.current_page = Some(response.text().await.map_err(|_| VtopError::NetworkError)?);
        let _ = self.extract_csrf_token();
        Ok(())
    }
    async fn perform_login(&mut self, captcha_answer: &str) -> VtopResult<()> {
        let csrf = self
            .session
            .get_csrf_token()
            .ok_or(VtopError::SessionExpired)?;

        // Note: We use reqwest's automatic encoding via multipart/form-data or simple form.
        // But the existing code manually constructs a string body with `application/x-www-form-urlencoded`.
        // If the password contains special chars, `urlencoding::encode` should be correct.
        // However, if the server expects raw text (unlikely) or double encoding issue exists.
        
        // Let's try to remove manual encoding if possible, OR check if `reqwest` `.form()` can be used.
        // Since `client.post(url).body(login_data)` is used, we must encode manually.
        // BUT, `urlencoding` crate might not be encoding exactly as Java/Tomcat expects?
        // Let's try using `form` method instead which handles encoding standardly.

        let params = [
            ("_csrf", csrf.as_str()),
            ("username", &self.username),
            ("password", &self.password),
            ("captchaStr", captcha_answer),
        ];

        // Debug: Print what we are sending
        eprintln!("Login attempt with:");
        eprintln!("Username: {}", self.username);
        eprintln!("Captcha Answer: {}", captcha_answer);
        // Do not print password for security, even in logs, unless necessary for local debug
        
        let url = format!("{}/vtop/login", self.config.base_url);

        let response = self
            .client
            .post(url)
            .form(&params)
            .send()
            .await
            .map_err(|_| VtopError::NetworkError)?;
        
        let response_url = response.url().to_string();
        let status = response.status();
        let response_text = response.text().await.map_err(|_| VtopError::NetworkError)?;

        eprintln!("Response URL: {}", response_url);
        eprintln!("Response Status: {}", status);

        if response_url.contains("error") || response_text.contains("alert") {
            // Debug: Write the failure page to a file for inspection
            let _ = std::fs::write("login_fail.html", &response_text);
            eprintln!("Login failed. Full page written to login_fail.html ({} bytes)", response_text.len());
            
            if response_text.contains("Invalid Captcha") {
                eprintln!("Detected: Invalid Captcha");
                return Err(VtopError::AuthenticationFailed(
                    "Invalid Captcha".to_string(),
                ));
            } else if response_text.contains("Invalid LoginId/Password")
                || response_text.contains("Invalid  Username/Password")
                || response_text.contains("User does not exist")
                || response_text.contains("Invalid credentials")
                || response_text.contains("Invalid credentials")
            {
                eprintln!("Detected: Invalid Credentials");
                return Err(VtopError::InvalidCredentials);
            } else {
                 // Try to find any alert div
                 if let Some(alert_idx) = response_text.find("alert") {
                     let snippet: String = response_text[alert_idx..].chars().take(500).collect();
                     eprintln!("Found alert snippet: {}", snippet);
                 }
                 return Err(VtopError::AuthenticationFailed(format!("Unknown error content. URL: {}", response_url)));
            }
        } else {
            self.current_page = Some(response_text);
            self.extract_csrf_token()?;
            self.get_regno()?;

            self.current_page = None;
            self.captcha_data = None;
            Ok(())
        }
    }
    async fn load_login_page(&mut self, k: bool) -> VtopResult<()> {
        if k {
            self.load_initial_page().await?;
            self.extract_csrf_token()?;
        }
        #[allow(non_snake_case)]
        let Max_RELOAD_ATTEMPTS = 8;
        let csrf = self
            .session
            .get_csrf_token()
            .ok_or(VtopError::SessionExpired)?;
        let url = format!("{}/vtop/prelogin/setup", self.config.base_url);
        let body = format!("_csrf={}&flag=VTOP", csrf);
        for _ in 0..Max_RELOAD_ATTEMPTS {
            let response = self
                .client
                .post(&url)
                .body(body.clone())
                .send()
                .await
                .map_err(|_| VtopError::NetworkError)?;
            if !response.status().is_success() {
                return Err(VtopError::VtopServerError);
            }
            let text = response.text().await.map_err(|_| VtopError::NetworkError)?;
            if text.contains("base64,") {
                eprintln!("Login page loaded. Searching for form fields...");
                if let Some(form_idx) = text.find("<form") {
                     let end_idx = text[form_idx..].find("</form>").unwrap_or(2000);
                     eprintln!("Full Login Form: {}", &text[form_idx..form_idx + end_idx + 7]);
                }
                self.current_page = Some(text);
                self.extract_captcha_data()?;
                self.extract_csrf_token()?; // CRITICAL: Extract the NEW CSRF token for the login POST
                break;
            }
            eprintln!("No captcha found in response. Text snippet: {}", text.chars().take(500).collect::<String>());
            println!("No captcha found Reloading the page ");
        }
        Ok(())
    }
    fn extract_captcha_data(&mut self) -> VtopResult<()> {
        let document = Html::parse_document(&self.current_page.as_ref().ok_or(
            VtopError::ParseError("Current page not found at captcha extration".into()),
        )?);
        let selector = Selector::parse("img.form-control.img-fluid.bg-light.border-0").unwrap();
        let captcha_src = document
            .select(&selector)
            .next()
            .and_then(|element| element.value().attr("src"))
            .ok_or(VtopError::CaptchaRequired)?;

        if captcha_src.contains("base64,") {
            self.captcha_data = Some(captcha_src.to_string());
        } else {
            return Err(VtopError::CaptchaRequired);
        }

        Ok(())
    }

    fn get_regno(&mut self) -> VtopResult<()> {
        let document = Html::parse_document(&self.current_page.as_ref().ok_or(
            VtopError::ParseError("Current page not found at captcha extration".into()),
        )?);
        let selector = Selector::parse("input[type=hidden][name=authorizedIDX]").unwrap();
        let k = document
            .select(&selector)
            .next()
            .and_then(|element| element.value().attr("value").map(|value| value.to_string()))
            .ok_or(VtopError::RegistrationParsingError)?;

        self.username = k;
        Ok(())
    }
    async fn solve_captcha(&self, captcha_data: &str) -> VtopResult<String> {
        let url_safe_encoded = URL_SAFE.encode(captcha_data.as_bytes());
        let captcha_url = format!("https://cap.va.synaptic.gg/captcha");

        #[derive(Serialize)]
        struct PostData {
            imgstring: String,
        }

        let client_for_post = reqwest::Client::new();
        let post_data = PostData {
            imgstring: url_safe_encoded,
        };
        let response = client_for_post
            .post(captcha_url)
            .json(&post_data)
            .send()
            .await
            .map_err(|_| VtopError::NetworkError)?;

        if !response.status().is_success() {
            return Err(VtopError::NetworkError);
        }
        response.text().await.map_err(|_| VtopError::NetworkError)
    }
    fn extract_csrf_token(&mut self) -> VtopResult<()> {
        let document = Html::parse_document(&self.current_page.as_ref().ok_or(
            VtopError::ParseError("Current page not found at csrf extration".into()),
        )?);
        let selector = Selector::parse("input[name='_csrf']").unwrap();
        let csrf_token = document
            .select(&selector)
            .next()
            .and_then(|element| element.value().attr("value"))
            .ok_or(VtopError::ParseError("CSRF token not found".to_string()))?;
        self.session.set_csrf_token(csrf_token.to_string());
        Ok(())
    }
    async fn load_initial_page(&mut self) -> VtopResult<()> {
        let url = format!("{}/vtop/open/page", self.config.base_url);
        let response = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|_| VtopError::NetworkError)?;

        if !response.status().is_success() {
            return Err(VtopError::VtopServerError);
        }
        let text = response.text().await.map_err(|_| VtopError::NetworkError)?;
        
        eprintln!("Initial page loaded. Form snippet:");
        if let Some(form_idx) = text.find("<form") {
            let end_idx = text[form_idx..].find("</form>").unwrap_or(2000);
            eprintln!("{}", &text[form_idx..form_idx + end_idx + 7]);
        }

        self.current_page = Some(text);

        Ok(())
    }
    // fn get_login_page_error(data: &str) -> String {
    //     let ptext = r#"span.text-danger.text-center[role="alert"]"#;
    //     let document = Html::parse_document(data);
    //     let selector = Selector::parse(&ptext).unwrap();
    //     if let Some(element) = document.select(&selector).next() {
    //         let error_message = element.text().collect::<Vec<_>>().join(" ");
    //         error_message.trim().into()
    //     } else {
    //         "Unknown login error".into()
    //     }
    // }
}
// for building
impl VtopClient {
    pub fn with_config(
        config: VtopConfig,
        session: SessionManager,
        username: String,
        password: String,
    ) -> Self {
        #[cfg(not(target_arch = "wasm32"))]
        {
            let client = Self::make_client(session.get_cookie_store());
            Self {
                client: client,
                config: config,
                session: session,
                current_page: None,
                username: username,
                password: password,
                captcha_data: None,
            }
        }
        #[cfg(target_arch = "wasm32")]
        {
            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("application/x-www-form-urlencoded"),
            );
            let client = reqwest::Client::builder()
                .default_headers(headers)
                .build()
                .unwrap();
            Self {
                client: client,
                config: config,
                session: session,
                current_page: None,
                username: username,
                password: password,
                captcha_data: None,
            }
        }
    }
    #[cfg(not(target_arch = "wasm32"))]
    fn make_client(cookie_store: Arc<Jar>) -> Client {
        let mut headers = HeaderMap::new();

        headers.insert(
            USER_AGENT,
            HeaderValue::from_static(
                "Mozilla/5.0 (Linux; U; Linux x86_64; en-US) Gecko/20100101 Firefox/130.5",
            ),
        );
        headers.insert(
            "Accept",
            HeaderValue::from_static(
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            ),
        );
        headers.insert(
            "Accept-Language",
            HeaderValue::from_static("en-US,en;q=0.5"),
        );
        headers.insert(
            "Content-Type",
            HeaderValue::from_static("application/x-www-form-urlencoded"),
        );
        headers.insert("Upgrade-Insecure-Requests", HeaderValue::from_static("1"));
        headers.insert("Sec-Fetch-Dest", HeaderValue::from_static("document"));
        headers.insert("Sec-Fetch-Mode", HeaderValue::from_static("navigate"));
        headers.insert("Sec-Fetch-Site", HeaderValue::from_static("same-origin"));
        headers.insert("Sec-Fetch-User", HeaderValue::from_static("?1"));
        headers.insert("Priority", HeaderValue::from_static("u=0, i"));

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .cookie_store(true)
            .cookie_provider(cookie_store)
            .danger_accept_invalid_certs(true)
            .build()
            .unwrap();
        return client;
    }
}
