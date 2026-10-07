# InterviewAI Application Documentation

This document explains the technologies, files, request flow, AI behavior, voice features, configuration, and deployment model used by InterviewAI.

## 1. What the application does

InterviewAI is a resume-driven mock interview application:

1. The user uploads a PDF resume.
2. The Python backend extracts selectable text from the PDF.
3. Groq parses that text into skills, projects, education, and experience.
4. The backend creates a personalized interview session.
5. The user answers questions by typing or speaking.
6. Groq evaluates each answer and chooses whether to:
   - ask a deeper follow-up question,
   - move to a different topic,
   - simplify the question, or
   - conclude the interview.
7. Groq generates a final report with scores, strengths, weaknesses, and improvement suggestions.

The main user-facing pages are defined in [`frontend/src/routes/`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/src/routes/):

| Route | File | Purpose |
|---|---|---|
| `/` | [`index.tsx`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/src/routes/index.tsx) | Landing page |
| `/upload` | [`upload.tsx`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/src/routes/upload.tsx) | PDF validation, upload, and resume analysis |
| `/analyzing` | [`analyzing.tsx`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/src/routes/analyzing.tsx) | Analysis progress screen |
| `/interview` | [`interview.tsx`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/src/routes/interview.tsx) | Live interview, text input, TTS, and STT |
| `/results` | [`results.tsx`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/src/routes/results.tsx) | Final AI evaluation and score display |

## 2. Technology stack

### Frontend

- React 19
- TypeScript
- Vite and TanStack Start
- TanStack Router for file-based routes
- Tailwind CSS 4
- Radix UI primitives
- Motion for animations
- Recharts for charts
- Bun or npm for dependency installation

The complete dependency list and scripts are in [`frontend/package.json`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/package.json).

Important scripts:

```json
{
  "dev": "vite dev",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint ."
}
```

The Vite/TanStack configuration is in [`frontend/vite.config.ts`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/vite.config.ts). Global styles are in [`frontend/src/styles.css`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/src/styles.css).

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- Groq Python SDK
- `pypdf` for PDF text extraction
- `python-dotenv` for local environment variables
- SQLite from Python's standard library for interview sessions

Backend dependencies are pinned or constrained in [`backend/requirements.txt`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/requirements.txt).

## 3. Frontend-to-backend flow

The frontend reads the backend URL from `VITE_API_URL`. During local development it falls back to port `8000`.

Used in:

- [`frontend/src/routes/upload.tsx`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/src/routes/upload.tsx)
- [`frontend/src/routes/interview.tsx`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/src/routes/interview.tsx)
- [`frontend/src/routes/results.tsx`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/src/routes/results.tsx)

```ts
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
```

### Request sequence

```text
Upload page
  POST /upload          PDF -> extracted text
  POST /analyze         extracted text -> parsed resume JSON
  sessionStorage        stores parsedResume

Interview page
  POST /start-interview parsed resume -> greeting + first question + session_id
  POST /answer          answer -> feedback/follow-up/next question
  sessionStorage        stores session_id, resume summary, and transcript

Results page
  POST /finish          transcript + resume summary -> final report JSON
```

### API endpoints

All endpoint implementations are in [`backend/main.py`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/main.py).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/upload` | Accepts a PDF and extracts selectable text |
| `POST` | `/analyze` | Sends resume text to Groq and returns structured resume data |
| `POST` | `/start-interview` | Creates a session and generates the first question |
| `POST` | `/next-question` | Legacy/simple next-question flow retained by the backend |
| `POST` | `/answer` | Evaluates an answer using the lifecycle-aware interview engine |
| `GET` | `/sessions/{session_id}` | Returns persisted session state and turn logs |
| `POST` | `/finish` | Generates and saves the final evaluation report |

Example frontend upload call from [`upload.tsx`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/src/routes/upload.tsx):

```ts
const formData = new FormData();
formData.append("file", f);

const uploadRes = await fetch(`${API_URL}/upload`, {
  method: "POST",
  body: formData,
});
```

## 4. Resume upload and parsing

The backend uses `pypdf` to read selectable text from each page. Image-only or scanned PDFs are rejected with a clear validation message because OCR is not included in the current implementation.

Relevant file: [`backend/main.py`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/main.py)

```python
reader = PdfReader(io.BytesIO(content))
resume_text = ""
for page in reader.pages:
    text = page.extract_text()
    if text:
        resume_text += text + "\n"

if not resume_text.strip():
    raise HTTPException(
        status_code=400,
        detail="The PDF contains no selectable text. It may be scanned or image-only.",
    )
```

The extracted text is then sent to Groq with instructions to return only these JSON keys:

```text
skills
projects
education
experience
```

The parsed result is saved in browser `sessionStorage` under `parsedResume` and is used to start the interview.

## 5. AI provider, API key, and model

### Provider

The application uses **Groq** through the official Groq Python client:

```python
from groq import Groq

api_key = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=api_key)
```

This code is in [`backend/main.py`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/main.py).

### API key

The required secret environment variable is:

```text
GROQ_API_KEY=your_groq_api_key_here
```

The actual key must be stored only in local environment files or the hosting provider's secret/environment-variable settings. It must never be placed in frontend code, committed to Git, or written into this documentation. The frontend does not need the Groq key because all Groq requests go through the backend.

Local backend configuration is loaded from [`backend/.env`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/.env) by `python-dotenv`. The repository's ignore rules exclude `.env` files; if a real key has ever been exposed or committed, revoke it and create a replacement in the Groq dashboard.

### Model

The default model is configured in [`backend/interview_engine.py`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/interview_engine.py):

```python
MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
MAX_QUESTIONS = int(os.environ.get("MAX_QUESTIONS", "5"))
```

The resume parser and the simpler `/start-interview` and `/next-question` paths also use `openai/gpt-oss-120b` directly in [`backend/main.py`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/main.py).

Optional backend variables:

```text
GROQ_API_KEY=...
GROQ_MODEL=openai/gpt-oss-120b
MAX_QUESTIONS=5
INTERVIEW_DB_PATH=/persistent/path/interview_sessions.db
```

### Groq request settings

Interview turns and final reports request JSON-only output and use a low temperature:

```python
completion = client.chat.completions.create(
    messages=messages,
    model=model,
    response_format={"type": "json_object"},
    temperature=0.4,
)
```

JSON output is validated with Pydantic models from [`backend/schemas.py`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/schemas.py).

## 6. Chain-of-thought (CoT) design

The interview engine is implemented in [`backend/interview_engine.py`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/interview_engine.py). Its prompt asks the model to perform a hidden evaluation stage before producing candidate-facing text.

The requested internal structure is:

```json
{
  "thought_process": {
    "evaluation": "Analysis of the latest answer against the resume",
    "gaps_found": "Missing or unverified technical depth",
    "strategy": "dig_deeper | pivot | simplify | conclude"
  },
  "interview_status": {
    "current_turn": 1,
    "max_turns": 5,
    "is_complete": false,
    "completion_reason": "In-progress"
  },
  "response": {
    "text": "Candidate-facing question or closing statement"
  }
}
```

The four strategies mean:

- `dig_deeper`: the answer is too shallow, so the interviewer asks a targeted follow-up.
- `pivot`: the answer shows enough mastery, so the interviewer moves to another resume topic.
- `simplify`: the candidate appears stuck, so the interviewer makes the next prompt easier or adds a subtle hint.
- `conclude`: the interview is complete and no new question is asked.

The engine sends the latest answer and a limited conversation history:

```python
messages = [
    {"role": "system", "content": system_prompt},
    {
        "role": "user",
        "content": build_user_message(answer, conversation, turn_count),
    },
]
```

### Important CoT handling detail

The frontend only displays `response.text`; it does not display `thought_process`. However, the backend intentionally stores the `evaluation`, `gaps_found`, and `strategy` fields as interview telemetry in SQLite and uses them to generate the final report.

The server also enforces the lifecycle instead of trusting the model's counters:

```python
if turn_count >= max_questions:
    status.is_complete = True
    thought.strategy = "conclude"
    status.completion_reason = "Max questions reached"
```

The engine retries one malformed JSON response. If the maximum turn count has been reached, it creates a local closing response rather than allowing an endless loop. These safeguards are in [`backend/interview_engine.py`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/interview_engine.py).

## 7. Text-to-speech (TTS)

TTS is implemented with the browser's built-in **Web Speech API**, not with a paid server-side voice provider. The relevant function is `speakText` in [`frontend/src/routes/interview.tsx`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/src/routes/interview.tsx).

```ts
function speakText(text: string, onEnd?: () => void) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.lang.startsWith("en") && v.name.includes("Female")) ||
    voices.find((v) => v.lang.startsWith("en"));
  if (preferred) utterance.voice = preferred;

  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}
```

Voice selection depends on the voices installed and exposed by the user's browser and operating system. There is no fixed cloud voice, voice ID, or TTS API key in this project.

The interview page loads available voices and lets the user turn speech on or off:

```ts
window.speechSynthesis.getVoices();
window.speechSynthesis.onvoiceschanged = () =>
  window.speechSynthesis.getVoices();
```

## 8. Speech-to-text (STT)

STT also uses a browser-native API: `SpeechRecognition` or the Chromium-prefixed `webkitSpeechRecognition`.

```ts
function getSpeechRecognition() {
  const w = window as unknown as {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}
```

Recording is configured as English US with interim results:

```ts
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = "en-US";
recognition.start();
```

Final recognition results are appended to the answer text, while interim recognition is shown separately until the browser finalizes it. Browsers without this API receive a fallback message telling the user to type their answer.

There is no Deepgram, Whisper, Google Speech, Azure Speech, or other external STT key configured in this repository.

## 9. Session state and storage

### Browser session storage

The frontend stores temporary workflow data in `sessionStorage`:

- `parsedResume`
- `interviewSessionId`
- `resumeSummary`
- `interviewTranscript`

This data is scoped to the browser tab/session and is used to move information between upload, interview, and results routes.

### SQLite backend storage

The backend uses [`backend/session_store.py`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/session_store.py) to persist:

- session ID and status,
- current turn count,
- maximum questions,
- resume summary,
- completion reason,
- final report,
- per-turn CoT telemetry.

The default database path is `backend/interview_sessions.db`. The database is ignored by Git. On Render, use a persistent disk if session data must survive service restarts; otherwise SQLite data on the default filesystem should be treated as temporary.

## 10. Final report generation

The results page posts the transcript to `/finish`:

```ts
const res = await fetch(`${API_URL}/finish`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    transcript,
    resume_summary: resumeSummary,
    session_id: sessionStorage.getItem("interviewSessionId") || null,
  }),
});
```

The backend combines the transcript, resume summary, and stored per-turn telemetry. The requested report fields are:

```text
overall_score
clarity_score
structure_score
confidence_score
strengths
weaknesses
improvements
summary
score_label
```

The report is generated by `generate_final_report` in [`backend/interview_engine.py`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/interview_engine.py) and saved through `SessionStore.save_report`.

## 11. Deployment

The intended deployment is:

```text
Frontend -> Vercel
Backend  -> Render
AI calls -> Groq, from the backend only
```

### Frontend on Vercel

The frontend root for Vercel is the `frontend` directory. The current Vercel rewrite configuration is in [`frontend/vercel.json`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/frontend/vercel.json):

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Recommended Vercel settings:

```text
Root Directory: frontend
Install Command: npm install
Build Command: npm run build
Output: use the framework/build output detected by Vercel
Environment variable:
  VITE_API_URL=https://ai-interview-backend-q5v4.onrender.com
```

`VITE_API_URL` is compiled into the browser bundle, so it may contain the public backend URL but must never contain `GROQ_API_KEY`.

### Backend on Render

The backend is a FastAPI service started with Uvicorn. Render should be configured with the repository root or the `backend` directory as the service root, matching the selected path:

```text
Build Command: pip install -r backend/requirements.txt
Start Command: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

If the Render service root is set to `backend`, use:

```text
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Required Render environment variables:

```text
GROQ_API_KEY=<secret Groq key>
GROQ_MODEL=openai/gpt-oss-120b
MAX_QUESTIONS=5
```

The backend currently allows all CORS origins in [`backend/main.py`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/main.py), which is convenient for development. For production, replace the wildcard with the exact Vercel origin:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://<your-vercel-domain>"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

The repository also contains [`backend/api/index.py`](C:/Users/dhruv/Downloads/Ai_Interview-main/Ai_Interview-main/backend/api/index.py), which mounts the FastAPI app under `/api` for a Vercel-style Python entrypoint. The primary architecture described above uses Render for the backend, so this file is not required when the backend is deployed as a normal Render web service. Do not accidentally configure both deployment approaches without also updating the frontend API URL and route prefixes.

## 12. Local development

### Start the backend

From the repository root:

```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend will use `http://localhost:8000` unless `VITE_API_URL` is set.

## 13. Security and production notes

- Keep `GROQ_API_KEY` server-side and rotate it immediately if it has been exposed.
- Do not put secrets in `VITE_*` variables; Vite exposes those variables to browser code.
- Restrict `allow_origins` to the deployed Vercel domain in production.
- Add authentication and authorization before exposing session lookup endpoints publicly.
- Use a persistent Render disk or a managed database if interview history must survive deploys.
- Treat resume text, transcripts, and CoT telemetry as sensitive candidate data.
- Consider storing only a minimal evaluation summary instead of full internal reasoning telemetry if privacy requirements prohibit retaining it.
- Add rate limiting and request-size limits at the edge or backend before making the service public.
