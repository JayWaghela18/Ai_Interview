"""
backend/main.py — InterviewAI Backend
──────────────────────────────────────
Task 1: POST /upload   → receives PDF, extracts selectable text via pypdf
Task 2: POST /analyze  → sends extracted text to Groq AI, returns structured JSON
"""

import os
import json
from pathlib import Path
from fastapi import BackgroundTasks, FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import io
from pypdf import PdfReader
from groq import Groq
from dotenv import load_dotenv

# ──────────────────────────────────────────────
# 1. Load environment variables from .env
# ──────────────────────────────────────────────
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

api_key = os.environ.get("GROQ_API_KEY")
if not api_key or api_key == "your_groq_api_key_here":
    print("⚠️  WARNING: GROQ_API_KEY is missing or still the placeholder!")
else:
    print(f"✅ GROQ_API_KEY loaded (starts with: {api_key[:8]}...)")

# ──────────────────────────────────────────────
# 2. Create FastAPI app + CORS
# ──────────────────────────────────────────────
app = FastAPI(title="InterviewAI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Allow frontend on any port (dev only)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# 3. Initialize the Groq AI client
# ──────────────────────────────────────────────
client = Groq(api_key=api_key)

# ──────────────────────────────────────────────
# 3b. Interview lifecycle: schemas, SQLite session state, CoT engine
# ──────────────────────────────────────────────
try:  # package import (backend.main) vs flat import (uvicorn main:app)
    from .schemas import AnswerRequest, FinishRequest, SessionState, StartInterviewRequest
    from .session_store import SessionStore
    from .interview_engine import (
        DEFAULT_CLOSING,
        GroqCallError,
        InvalidAIResponseError,
        MAX_QUESTIONS,
        build_system_prompt,
        format_cot_logs,
        generate_final_report,
        run_interview_turn,
    )
except ImportError:  # pragma: no cover
    from schemas import AnswerRequest, FinishRequest, SessionState, StartInterviewRequest  # type: ignore
    from session_store import SessionStore  # type: ignore
    from interview_engine import (  # type: ignore
        DEFAULT_CLOSING,
        GroqCallError,
        InvalidAIResponseError,
        MAX_QUESTIONS,
        build_system_prompt,
        format_cot_logs,
        generate_final_report,
        run_interview_turn,
    )

store = SessionStore()
print(f"🗄️  Session store ready: {store.db_path} (MAX_QUESTIONS={MAX_QUESTIONS})")


# ──────────────────────────────────────────────
# Request body model for /analyze
# ──────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    """The frontend sends the extracted resume text in this format."""
    text: str


# ══════════════════════════════════════════════
# ROUTE: GET /
# Health check — verify the server is alive
# ══════════════════════════════════════════════
@app.get("/")
def health_check():
    return {"status": "ok", "message": "InterviewAI backend is running!"}


# ══════════════════════════════════════════════
# ROUTE: POST /upload  (Task 1)
# Receives a PDF file → extracts text → returns it
# ══════════════════════════════════════════════
@app.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    """
    Accepts a PDF resume and extracts selectable text using pypdf.
    Returns: { filename, pages, text }
    """

    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Read and extract text
    content = await file.read()
    try:
        reader = PdfReader(io.BytesIO(content))
        resume_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                resume_text += text + "\n"
        num_pages = len(reader.pages)
    except Exception as e:
        print("PDF parse error:", e)
        raise HTTPException(status_code=400, detail="Could not read the PDF file.")

    if not resume_text.strip():
        raise HTTPException(
            status_code=400,
            detail=(
                "The PDF contains no selectable text. It may be scanned or image-only. "
                "Run OCR on the PDF or upload a text-based PDF."
            ),
        )

    print(f"✅ /upload — Extracted {len(resume_text)} chars from {num_pages} page(s)")
    return {
        "filename": file.filename,
        "pages": num_pages,
        "text": resume_text.strip()
    }


# ══════════════════════════════════════════════
# ROUTE: POST /analyze  (Task 2)
# Takes extracted resume text → sends to Groq AI
# → returns structured JSON with skills, projects,
#   education, and experience
# ══════════════════════════════════════════════
@app.post("/analyze")
async def analyze_resume(body: AnalyzeRequest):
    """
    Sends the resume text to Groq's Llama 3.3 model for
    ATS-style parsing. Returns structured JSON.

    Request body:  { "text": "John Doe ... Software Engineer ..." }
    Response:      { "skills": [...], "projects": [...], ... }
    """

    # ── Step 1: Validate the input ──
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Resume text is empty.")

    # ── Step 2: Build the prompt for the AI ──
    prompt = f"""You are an expert ATS (Applicant Tracking System) resume parser.
Analyze the following resume text and extract the information into a JSON object with these exact keys:

- "skills": a list of skill strings (e.g. ["Python", "React", "Docker"])
- "projects": a list of objects, each with "name" (string) and "description" (string)
- "education": a list of objects, each with "degree" (string), "institution" (string), and "year" (string)
- "experience": a list of objects, each with "title" (string), "company" (string), "duration" (string), and "description" (string)

If a section is not found in the resume, return an empty list for that key.
Return ONLY the JSON object, nothing else.

Resume Text:
{body.text}"""

    # ── Step 3: Call the Groq API ──
    print("🤖 Sending resume to Groq AI for analysis...")
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="openai/gpt-oss-120b",
            response_format={"type": "json_object"},  # Forces valid JSON output
        )
    except Exception as e:
        print(f"❌ Groq API error: {e}")
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    # ── Step 4: Parse and return the AI response ──
    ai_response = chat_completion.choices[0].message.content

    try:
        parsed_data = json.loads(ai_response)
    except json.JSONDecodeError:
        print(f"❌ AI returned invalid JSON: {ai_response[:200]}")
        raise HTTPException(status_code=500, detail="AI returned invalid JSON. Please try again.")

    # Log a summary of what was found
    print(f"✅ /analyze — Found: "
          f"{len(parsed_data.get('skills', []))} skills, "
          f"{len(parsed_data.get('projects', []))} projects, "
          f"{len(parsed_data.get('education', []))} education entries, "
          f"{len(parsed_data.get('experience', []))} experience entries")

    return parsed_data


# ──────────────────────────────────────────────
# Request/response models for Interview routes
# (StartInterviewRequest, AnswerRequest, FinishRequest now live in backend/schemas.py)
# ──────────────────────────────────────────────
class NextQuestionRequest(BaseModel):
    """User's answer + conversation history so far."""
    answer: str
    conversation: list  # list of { "role": "assistant" | "user", "content": str }
    resume_summary: str  # brief resume context for the AI
    question_number: int  # which question we're on (1-indexed)
    total_questions: int = 5


# ══════════════════════════════════════════════
# ROUTE: POST /start-interview  (Task 5)
# Takes parsed resume → generates first question
# ══════════════════════════════════════════════
@app.post("/start-interview")
async def start_interview(body: StartInterviewRequest):
    """
    Receives the parsed resume data and generates the first
    interview question tailored to the candidate's background.

    Returns: { "question": "...", "resume_summary": "..." }
    """

    # Build a concise summary of the resume for context
    resume_summary = f"""
Skills: {', '.join(body.skills[:15]) if body.skills else 'Not specified'}
Projects: {', '.join([p.get('name', '') if isinstance(p, dict) else str(p) for p in body.projects[:5]]) if body.projects else 'None listed'}
Education: {', '.join([e.get('degree', '') + ' from ' + e.get('institution', '') if isinstance(e, dict) else str(e) for e in body.education[:3]]) if body.education else 'Not specified'}
Experience: {', '.join([e.get('title', '') + ' at ' + e.get('company', '') if isinstance(e, dict) else str(e) for e in body.experience[:5]]) if body.experience else 'Not specified'}
""".strip()

    prompt = f"""You are Nova, a friendly but professional AI interviewer. You are conducting a behavioral and technical interview.

Here is the candidate's resume summary:
{resume_summary}

Generate your opening greeting and first interview question. The question should be:
- Personalized to their resume (reference a specific skill, project, or experience)
- Open-ended to encourage a detailed answer
- Professional but warm in tone

Return ONLY a JSON object with:
- "greeting": a brief warm greeting (1 sentence)
- "question": the first interview question

Example format:
{{"greeting": "Hi! Thanks for joining. I've reviewed your background and I'm excited to learn more.", "question": "I see you worked on X project using Y technology. Can you walk me through the biggest challenge you faced?"}}"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="openai/gpt-oss-120b",
            response_format={"type": "json_object"},
        )
    except Exception as e:
        print(f"❌ Groq API error: {e}")
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    ai_response = chat_completion.choices[0].message.content
    try:
        result = json.loads(ai_response)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON.")

    # ── Create server-side session state (turn_count = 0 until first answer) ──
    session = store.create_session(resume_summary, max_questions=MAX_QUESTIONS)

    print(f"✅ /start-interview — First question generated "
          f"(session {session['session_id'][:8]}…, max_questions={MAX_QUESTIONS})")
    return {
        "greeting": result.get("greeting", "Welcome! Let's begin your interview."),
        "question": result.get("question", "Tell me about yourself and your experience."),
        "resume_summary": resume_summary,
        "session_id": session["session_id"],
        "turn_count": 0,
        "max_questions": MAX_QUESTIONS,
    }


# ══════════════════════════════════════════════
# ROUTE: POST /next-question  (Task 5)
# Takes user's answer + history → generates next Q
# ══════════════════════════════════════════════
@app.post("/next-question")
async def next_question(body: NextQuestionRequest):
    """
    Receives the user's answer and conversation history,
    generates a follow-up question or wraps up the interview.

    Returns: { "question": "...", "feedback": "..." }
    """

    if not body.answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty.")

    is_last = body.question_number >= body.total_questions

    prompt = f"""You are Nova, a friendly but professional AI interviewer conducting question {body.question_number} of {body.total_questions}.

Candidate's resume summary:
{body.resume_summary}

The candidate just answered your previous question. Here is the conversation so far:
{json.dumps(body.conversation, indent=2)}

Their latest answer: "{body.answer}"

{"This is the LAST question. After your brief feedback, provide a warm closing remark thanking the candidate." if is_last else ""}

Return ONLY a JSON object with:
- "feedback": brief positive feedback on their answer (1-2 sentences, be encouraging)
- "question": {"a closing remark thanking them for their time (since this is the last question)" if is_last else "your next interview question (personalized, open-ended, different topic from previous questions)"}
- "is_complete": {"true" if is_last else "false"}"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="openai/gpt-oss-120b",
            response_format={"type": "json_object"},
        )
    except Exception as e:
        print(f"❌ Groq API error: {e}")
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    ai_response = chat_completion.choices[0].message.content
    try:
        result = json.loads(ai_response)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON.")

    print(f"✅ /next-question — Q{body.question_number}/{body.total_questions} "
          f"{'(final)' if is_last else ''}")

    return {
        "feedback": result.get("feedback", "Good answer!"),
        "question": result.get("question", ""),
        "is_complete": result.get("is_complete", is_last)
    }


# ──────────────────────────────────────────────
# Helpers for the /answer lifecycle
# ──────────────────────────────────────────────
def _turn_response(payload, session_id: str, turn_count: int) -> dict:
    """
    Map the validated CoT payload onto the frontend contract
    (verdict / feedback / follow_up_question / next_question / is_complete)
    while echoing session + telemetry fields.
    """
    thought = payload.thought_process
    status = payload.interview_status
    text = payload.response.text

    body = {
        "verdict": "satisfied",
        "feedback": "",
        "follow_up_question": None,
        "next_question": None,
        "is_complete": status.is_complete,
        "session_id": session_id,
        "turn_count": turn_count,
        "max_questions": MAX_QUESTIONS,
        "strategy": thought.strategy,
        "completion_reason": status.completion_reason,
        "thought_process": thought.model_dump(),
        "interview_status": status.model_dump(),
    }
    if status.is_complete:
        body["next_question"] = text  # closing statement
    elif thought.strategy == "dig_deeper":
        body["verdict"] = "follow_up"
        body["follow_up_question"] = text
    else:  # pivot / simplify → advance to the next question
        body["next_question"] = text
    return body


def _closing_response(session: dict) -> dict:
    """Idempotent reply when extra answers arrive after the session completed."""
    return {
        "verdict": "satisfied",
        "feedback": "",
        "follow_up_question": None,
        "next_question": session.get("closing_statement") or DEFAULT_CLOSING,
        "is_complete": True,
        "session_id": session["session_id"],
        "turn_count": session["turn_count"],
        "max_questions": session["max_questions"],
        "strategy": "conclude",
        "completion_reason": session.get("completion_reason") or "Max questions reached",
        "thought_process": {
            "evaluation": "Session already completed — no further evaluation.",
            "gaps_found": "",
            "strategy": "conclude",
        },
        "interview_status": {
            "current_turn": session["turn_count"],
            "max_turns": session["max_questions"],
            "is_complete": True,
            "completion_reason": session.get("completion_reason") or "Max questions reached",
        },
    }


def _generate_report_task(session_id: str, resume_summary: str) -> None:
    """Background task: build the final report from stored thought_process logs."""
    try:
        logs = store.list_turn_logs(session_id)
        report = generate_final_report(
            client, resume_summary=resume_summary, logs=logs
        )
        store.save_report(session_id, report)
        print(f"✅ report generated for session {session_id[:8]}…")
    except Exception as e:
        print(f"❌ report generation failed for session {session_id[:8]}…: {e}")


# ══════════════════════════════════════════════
# ROUTE: POST /answer  (Task 6 — refactored)
# Session state + CoT reasoning + termination guardrails
# ══════════════════════════════════════════════
@app.post("/answer")
def evaluate_answer(body: AnswerRequest, background_tasks: BackgroundTasks):
    """
    1. Resolve session state; increment turn_count (+1 per user response).
    2. Call Groq with the strict CoT system prompt (response_format=json_object).
    3. Parse + validate the JSON payload (Pydantic) and re-enforce lifecycle
       guardrails — the interview CAN NOT exceed MAX_QUESTIONS.
    4. Store thought_process telemetry; on completion mark the session
       "completed" and trigger the final report from stored logs.

    Returns the candidate-facing text in the original contract shape:
        verdict / feedback / follow_up_question / next_question / is_complete
    plus session + CoT telemetry fields.
    """
    if not body.answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty.")

    # ── 1. Session state tracking ──
    session = store.get_session(body.session_id) if body.session_id else None
    if session is None:
        # Legacy client (no session_id) — create state keyed to this resume.
        session = store.create_session(body.resume_summary, max_questions=MAX_QUESTIONS)

    if session["status"] == "completed":
        # Termination guard: never reopen a finished interview.
        print(f"/answer — session {session['session_id'][:8]}… already completed; ignoring answer")
        return _closing_response(session)

    turn_count = store.increment_turn(session["session_id"])  # +1 on every response
    resume_context = body.resume_summary or session["resume_summary"]

    # ── 2. Groq invocation with CoT prompt ──
    system_prompt = build_system_prompt(resume_context, turn_count, MAX_QUESTIONS)
    try:
        payload = run_interview_turn(
            client,
            system_prompt=system_prompt,
            answer=body.answer,
            conversation=body.conversation,
            turn_count=turn_count,
            max_questions=MAX_QUESTIONS,
        )
    except InvalidAIResponseError as e:
        print(f"❌ /answer — invalid AI JSON at turn {turn_count}: {e}")
        raise HTTPException(status_code=502, detail="AI returned invalid JSON. Please try again.")
    except GroqCallError as e:
        print(f"❌ Groq API error: {e}")
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    # ── 3. Store thought_process for telemetry + final report ──
    thought = payload.thought_process
    status = payload.interview_status
    store.record_turn(
        session["session_id"],
        turn_count,
        thought.strategy,
        thought.evaluation,
        thought.gaps_found,
        status.is_complete,
        status.completion_reason,
        payload.response.text,
    )

    # ── 4. Termination branch ──
    response_body = _turn_response(payload, session["session_id"], turn_count)

    if status.is_complete:
        store.complete_session(
            session["session_id"],
            closing_statement=payload.response.text,
            completion_reason=status.completion_reason,
        )
        # Trigger final report generation from stored thought_process logs
        background_tasks.add_task(
            _generate_report_task, session["session_id"], resume_context
        )
        print(f"✅ /answer — session {session['session_id'][:8]}… COMPLETED at "
              f"turn {turn_count}/{MAX_QUESTIONS} ({status.completion_reason})")
    else:
        print(f"✅ /answer — turn {turn_count}/{MAX_QUESTIONS} "
              f"strategy={thought.strategy}")

    return response_body


# ══════════════════════════════════════════════
# ROUTE: GET /sessions/{session_id}
# Telemetry: session state + stored CoT logs + report
# ══════════════════════════════════════════════
@app.get("/sessions/{session_id}", response_model=SessionState)
def get_session_state(session_id: str):
    state = store.snapshot(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return state


# ══════════════════════════════════════════════
# ROUTE: POST /finish  (Task 7)
# Generates overall interview summary, scores,
# strengths, weaknesses, and improvements
# ══════════════════════════════════════════════
@app.post("/finish")
async def finish_interview(body: FinishRequest):
    """
    Takes the full interview transcript and generates a
    comprehensive evaluation with scores and feedback.

    Returns: {
        overall_score: int,
        clarity_score: int,
        structure_score: int,
        confidence_score: int,
        strengths: [str],
        weaknesses: [str],
        improvements: [str],
        summary: str,
        score_label: str
    }
    """

    # ── Fast path: report already generated from stored CoT logs ──
    if body.session_id:
        existing = store.get_session(body.session_id)
        if existing and existing.get("report"):
            print(f"✅ /finish — returning stored report for session {body.session_id[:8]}…")
            return existing["report"]

    if not body.transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty.")

    # Format transcript for the prompt
    transcript_text = ""
    for entry in body.transcript:
        who = entry.get("who", "Unknown")
        text = entry.get("text", "")
        transcript_text += f"{who}: {text}\n"

    # Merge stored thought_process telemetry (if this session has any)
    cot_section = ""
    if body.session_id:
        logs = store.list_turn_logs(body.session_id)
        if logs:
            cot_section = (
                "\nPer-turn Chain-of-Thought telemetry captured by the interviewer:\n"
                + format_cot_logs(logs)
                + "\n"
            )

    prompt = f"""You are Nova, an expert AI interview evaluator. Analyze this complete interview transcript and provide a comprehensive evaluation.

Candidate's resume:
{body.resume_summary}
{cot_section}
Full Interview Transcript:
{transcript_text}

Evaluate the candidate and return ONLY a JSON object with these exact fields:
- "overall_score": integer 0-100 representing overall interview performance
- "clarity_score": integer 0-100 for communication clarity
- "structure_score": integer 0-100 for answer structure (STAR method, logical flow)
- "confidence_score": integer 0-100 for confidence and delivery
- "strengths": array of exactly 3 strings describing specific strengths (reference actual answers)
- "weaknesses": array of exactly 3 strings describing specific areas to improve (be constructive)
- "improvements": array of exactly 3 strings with actionable improvement tips
- "summary": a 3-4 sentence paragraph summarizing the candidate's overall performance, highlighting their best moment and main area for growth
- "score_label": one of "Exceptional", "Strong", "Good", "Developing", or "Needs Work" based on the overall_score

Be fair but encouraging. Reference specific parts of their actual answers when possible."""

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="openai/gpt-oss-120b",
            response_format={"type": "json_object"},
        )
    except Exception as e:
        print(f"❌ Groq API error: {e}")
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    ai_response = chat_completion.choices[0].message.content
    try:
        result = json.loads(ai_response)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON.")

    print(f"✅ /finish — Score: {result.get('overall_score', 'N/A')}/100 "
          f"({result.get('score_label', 'N/A')})")

    report = {
        "overall_score": result.get("overall_score", 75),
        "clarity_score": result.get("clarity_score", 75),
        "structure_score": result.get("structure_score", 75),
        "confidence_score": result.get("confidence_score", 75),
        "strengths": result.get("strengths", ["Good communication", "Clear answers", "Professional demeanor"]),
        "weaknesses": result.get("weaknesses", ["Could provide more examples", "Room for deeper analysis", "Consider more structured responses"]),
        "improvements": result.get("improvements", ["Practice STAR method", "Prepare specific examples", "Work on conciseness"]),
        "summary": result.get("summary", "The candidate showed good potential. With more preparation and practice, they can significantly improve their interview performance."),
        "score_label": result.get("score_label", "Good")
    }

    # Persist the report on the session so it can be reused (and by the telemetry endpoint)
    if body.session_id and store.get_session(body.session_id):
        store.save_report(body.session_id, report)

    return report