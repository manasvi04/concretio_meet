# Candidly: Technical Documentation

## 1) Overview
Candidly (interview_chatbot_assistant) is a modular Python system that monitors and analyzes interview sessions run on Daily.co. It automates joining the meeting UI, performs real-time visual detections (face presence, eye tracking, multiple faces, forbidden objects), optionally transcribes audio, and generates a comprehensive report per session (PDF/HTML) with violation summaries and LLM-driven interview evaluation.

Primary components:
- Browser automation using Playwright to join and interact with a custom Daily UI.
- CV detections using MTCNN, MediaPipe Face Mesh, and YOLOv8.
- Audio transcription via faster-whisper (optional) using cloud recording audio.
- Report generation with Jinja2 + pdfkit (wkhtmltopdf).
- Daily.co APIs for room presence, meetings, and recordings.
- Optional OpenAI API for transcript evaluation and structured feedback.

## 2) Repository Structure
Root directory: `interview_chatbot_assistant/`

- `.env`
  - Environment variables (e.g., `DAILY_API_KEY`, `OPENAI_API_KEY`). Loaded by `code/utils/env_utils.py`.

- `README.md`
  - Brief features overview.

- `config/config.yaml`
  - Global settings for logging, reporting, and recording poll strategy. Key for `wkhtmltopdf_path` and severity/rating thresholds.

- `code/`
  - `main.py`
    - Entry point that orchestrates the session lifecycle: joins the meeting UI, runs detections, collects participants, manages chat alerts, fetches recording audio for transcription, runs LLM evaluation, and triggers report generation.
  - `launcher.py`
    - Utility to enumerate Daily rooms and launch per-room bot processes (Windows minimized CMD or Linux gnome-terminal). Performs pre-checks such as nbf (not-before) and bot presence.
  - `automation/`
    - `browser_session.py`: `BrowserSession` context manager for Playwright Chromium launch with permissions (camera/mic).
    - `navigation.py`: Helpers to open the Vercel UI, ensure it’s ready, and access the Daily iframe/frame.
    - `join_flow.py`: Fills room and joins as "Observer Bot".
    - `recording_controls.py`: Start/stop recording and leave.
    - `chat.py`: Opens chat and sends messages.
    - `participants.py`: Presence utilities and pinning.
    - `screenshots.py`: Capture page screenshots.
  - `detection/`
    - `detection_config.yaml`: Tunables for face, eye, multi-face, objects, and audio monitoring.
    - `face_detection.py`: MTCNN-based face presence. Emits `FACE_DISAPPEARED` / `FACE_REAPPEARED` based on durations.
    - `eye_tracking.py`: MediaPipe Face Mesh-based gaze and EAR tracking. Emits `EYE_MOVEMENT` when excessive changes detected.
    - `multi_face.py`: Hybrid MTCNN + MediaPipe detection with merging and heuristics; emits `MULTIPLE_FACES` on threshold.
    - `object_detection.py`: YOLOv8 with class filters and per-class thresholds; emits `FORBIDDEN_OBJECT`. Special handling for TV min-area.
  - `models/`
    - `yolov8l.pt`: YOLOv8 large model checkpoint (COCO classes). Referenced by `detection/detection_config.yaml`.
  - `report_generation/`
    - `report_generator.py`: Builds charts (timeline), renders HTML via Jinja2, and exports PDF via `pdfkit` + wkhtmltopdf.
    - `score_evaluator.py`: Calls OpenAI Chat Completions on transcript + logs using a strict prompt; returns formatted analysis and parses it.
    - `templates/`: HTML template(s) for rendering reports.
    - `wkhtmltopdf/`: Bundled wkhtmltopdf binaries (Windows path referenced in `config.yaml`).
  - `services/`
    - `alerts.py`: `AlertLogger` with cooldown, console/log file output, chat queue integration, and violation list management.
    - `send_message.py`: Email helper (currently not used by default in `main.py`).
  - `utils/`
    - `env_utils.py`: Minimal `.env` loader and getters for `DAILY_API_KEY` and `OPENAI_API_KEY`.
    - `api_utils.py`: Daily.co API wrappers (rooms, presence, meetings, recordings, and helpers used by `main.py`/`launcher.py`).
    - `media_utils.py`: Download/extract/fetch helpers for recordings and audio artifacts.
    - `crop_ss.py`: Compute and crop the “big tile” from UI screenshots for accurate CV detection.
    - `pin_participant.py`: Placeholder/utility for pinning participant logic.
    - `terminal_log.py`: Terminal logging init.
    - `detection_utils.py`, `path_utils.py`, `time_utils.py`: Additional helpers.
  - `transcript_generator.py`
    - `AudioMonitor` for post-session transcription using faster-whisper and saving transcript files into `code/session_data/transcripts_doc/`.
  - `screenshot_capture.py`
    - `ViolationCapturer` used by `AlertLogger` to save snapshots (referenced by `main.py`).
  - `session_data/`
    - Runtime artifacts: logs, screenshots, transcripts, recordings.
  - `reports/`
    - Report outputs written to `reports/generated/` (and `reports/generated/images/`).

## 3) Execution Flow
1. `code/main.py`
   - Loads `.env` via `env_utils.load_dotenv()` and resolves Daily/OpenAI keys.
   - Queries next Daily meeting using `utils/api_utils.get_next_daily_meeting()` and determines the `room_name`.
   - Creates a Playwright `BrowserSession`, opens the custom Vercel-hosted UI, and performs join via `automation.join_flow.fill_room_and_join()`.
   - Initializes detectors:
     - `FaceDetector`, `EyeTracker`, `MultiFaceDetector`, `ObjectDetector`.
     - Wires them to a shared `AlertLogger` that writes to `session_data/logs/alerts_<room>_<ts>.log` and appends to the in-memory `violations` list. Screenshots are captured via `screenshot_capture.ViolationCapturer` when available.
   - Loop:
     - Periodically captures page screenshot; crops to “big tile” view via `utils.crop_ss.get_big_tile_crop()`.
     - Runs all enabled detections; logs alerts; sends chat messages through `automation.chat.send_chat_message()` using a queue.
     - Tracks meeting participants and attempts pinning once.
     - If all participants leave, waits up to a short duration then stops recording and exits.
   - After the meeting:
     - Polls Daily recordings (`utils.media_utils.fetch_cloud_recording_wav`) to obtain audio.
     - If audio available, `AudioMonitor.get_transcript_text()` transcribes it and stores transcript to `code/session_data/transcripts_doc/`.
     - Calls `report_generation.score_evaluator.analyze_transcript(room_name)` to run LLM evaluation on the transcript + logs.
     - Uses `report_generation.ReportGenerator.generate_report(...)` to render and export report (PDF by default). One per non-interviewer participant.

2. `code/launcher.py`
   - Lists rooms and applies eligibility checks (nbf not in the future, not already bot-present).
   - Launches `main.py` per room in a separate terminal process.

## 4) Configuration
- `config/config.yaml`
  - `logging.log_path`: Directory for alert logs, e.g., `./session_data/logs`.
  - `logging.alert_cooldown`: Minimum seconds between same-type alerts.
  - `global.output_path`: Not directly used by the reporting code (reporting has its own `output_dir`).
  - `reporting.image_dir`: Path for chart images; is set under `reports/generated/images`.
  - `reporting.output_dir`: Report export directory.
  - `reporting.wkhtmltopdf_path`: Absolute path to `wkhtmltopdf.exe`. Must be correct for PDF export on Windows.
  - `reporting.rating_thresholds`: Thresholds for severity ratings in report stats.
  - `reporting.severity_levels`: Numeric weights per violation to compute a severity score.
  - `recording.poll_total_secs` / `poll_interval_secs`: How long and how frequently to poll Daily’s recordings endpoint.

- `code/detection/detection_config.yaml`
  - `detection.face`: `detection_interval`, `min_confidence`.
  - `detection.eye_tracking`: `gaze_threshold`, `consecutive_frames`.
  - `detection.multi_face`: `alert_threshold` frames.
  - `detection.objects`:
    - `model_path`, `imgsz`, `base_conf`, `iou`, `augment`, `detection_interval`, `max_fps`, `min_confidence`.
    - `class_map`: COCO IDs to human labels (e.g., 73 book, 67 phone, 62 TV, 65 remote, 63 laptop).
    - `class_thresholds`: Per-class confidence thresholds.
    - `tv_class_id`, `tv_min_area_frac`: Special handling to reduce false positives for TV-like detections.
  - `detection.audio_monitoring`:
    - `whisper_enabled` and `whisper_model` for faster-whisper.

Configuration is merged in `code/main.py`: it loads `config/config.yaml` and, if present, overlays `detection/detection_config.yaml` under `config['detection']`.

## 5) External Services and Dependencies
- Daily.co API
  - Used for rooms, presence, meetings, recordings. Implemented in `utils/api_utils.py`.
  - Requires `DAILY_API_KEY` in `.env`.
- Browser Automation: Playwright
  - Chromium headless with media permissions. See `automation/browser_session.py`.
- Computer Vision
  - `facenet_pytorch` (MTCNN) for face presence and multi-face detection.
  - `mediapipe` for facial landmarks and face detection.
  - `ultralytics` + `torch` for YOLOv8-based object detection.
  - `opencv-python` for image processing.
- Audio / Transcription
  - `faster-whisper` for transcription.
  - Recording audio is pulled from Daily cloud recordings, then WAV is processed.
- Reporting
  - `jinja2`, `matplotlib`, `pdfkit`, and `wkhtmltopdf`.
- LLM Analysis (Optional)
  - `openai` client with `OPENAI_API_KEY`. Model currently set to `gpt-4` in `score_evaluator.py`.

## 6) Outputs and Artifacts
- `code/session_data/`
  - `logs/alerts_<room>_<timestamp>.log`: Text logs of alerts.
  - `screenshots/`: Captured violation images (via `screenshot_capture.ViolationCapturer`).
  - `transcripts_doc/transcript_<room>_<timestamp>.txt`: Transcript stored post transcription.
  - `recordings/`: Local audio intermediates, when applicable.
- `reports/generated/`
  - `report_<room>_<studentId>_<timestamp>.pdf`: Final report per participant.
  - `images/timeline_<studentId>.png`: Timeline chart of violations.

## 7) Running Locally
Prerequisites:
- Python 3.10+
- Playwright installed and browsers set up (run `playwright install` and grant camera/mic permissions as needed).
- GPU optional; CPU works, but YOLO and whisper models may be slower.
- wkhtmltopdf installed or use the bundled path configured in `config/config.yaml` on Windows.

Environment:
- Create `.env` at repo root with at least:
  - `DAILY_API_KEY=<your_daily_api_key>`
  - `OPENAI_API_KEY=<your_openai_api_key>` (if LLM analysis enabled)

Install dependencies (example):
```bash
pip install -r requirements.txt
python -m playwright install
```

Start the bot for the next scheduled room:
```bash
python code/main.py
```

Launch bots for eligible rooms in parallel terminals:
```bash
python code/launcher.py
```

Notes:
- The UI URL used is `https://concretiomeet.vercel.app/` in `main.py`. Ensure the UI is reachable.
- Reports require `report_generation/templates/base_report.html` and a valid wkhtmltopdf path.
- If no participants join, report generation is skipped.

## 8) Detection Details
- Face Detection (`FaceDetector`)
  - Uses MTCNN and tracks disappearance (>5s) to raise `FACE_DISAPPEARED`.
  - On reappearance after disappearance, raises `FACE_REAPPEARED` once.
- Eye Tracking (`EyeTracker`)
  - MediaPipe Face Mesh to compute EAR and gaze changes. If `gaze_changes` exceed heuristics within a short time, logs `EYE_MOVEMENT`.
- Multi-Face (`MultiFaceDetector`)
  - Combines MTCNN and MediaPipe detections, merges overlapping/nearby boxes (IoU/center-distance/inside checks) and debounces via `alert_threshold`. Raises `MULTIPLE_FACES` only after consecutive frames.
  - Filters out likely reflections via bottom-right corner heuristic.
- Object Detection (`ObjectDetector`)
  - Ultralytics YOLOv8 constrained to `class_map` IDs with per-class thresholds; optional TV area filter to reduce false positives. Raises `FORBIDDEN_OBJECT` with label.

## 9) Alerts and Logging
- `services/alerts.py` implements `AlertLogger` with:
  - Per-alert-type cooldown (`logging.alert_cooldown`).
  - Console printing, file logging, violation list append, optional screenshot capture via `ViolationCapturer`.
  - Enqueues formatted alert text into chat queue; `automation.chat.send_chat_message` posts it to the meeting chat when chat is open.

## 10) LLM Evaluation and Parsing
- `report_generation/score_evaluator.py`:
  - Builds a structured prompt using transcript + system logs.
  - Calls `OpenAI` Chat Completions (model `gpt-4`).
  - `parse_llm_response(...)` parses the plain-text response into:
    - `candidate_analysis`: Communication, Technical, Attitude, Overall Remark
    - `interviewer_analysis`: Questions Asked, Difficulty, Attitude
    - `decision`: Status + Summary

## 11) Configuration Tips and Tuning
- If YOLO false positives for TVs persist, increase `tv_min_area_frac` and/or class-specific thresholds.
- Adjust `eye_tracking` thresholds if users commonly look at dual monitors.
- Use higher YOLO `imgsz` and `augment=true` for far/partial objects (trade-off: speed).
- Enable/disable transcription by toggling `detection.audio_monitoring.whisper_enabled`.
- Ensure `reporting.severity_levels` align with organizational policy for severity scoring.

## 12) Security and Secrets
- Do not commit `.env` with real keys. `.gitignore` covers it.
- API keys are loaded at runtime via `env_utils.load_dotenv` and `get_*_api_key()`.

## 13) Known Limitations
- Reliability of eye gaze and multi-face detection can vary with lighting, camera placement, and UI layout.
- If the Daily UI changes significantly, `crop_ss.get_big_tile_crop` and automation selectors may need updates.
- LLM evaluation requires valid `OPENAI_API_KEY` and network access; errors are handled with user-friendly fallbacks.

## 14) Extensibility
- Add more object classes by extending `detection/detection_config.yaml` `class_map` and thresholds.
- Introduce new violations by emitting additional alert types from detectors.
- Add new report sections by modifying `report_generation/templates/base_report.html` and `report_generator.py`.
- Swap LLM provider by abstracting the call in `score_evaluator.py`.

---

For questions or enhancements, start from `code/main.py` and the config files to understand feature toggles and flow.
