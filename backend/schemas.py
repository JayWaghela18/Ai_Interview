"""
backend/schemas.py — Pydantic models for the AI Interviewer lifecycle.

Covers three concerns:
1. The strict JSON payload the Groq model MUST return every turn
   (thought_process CoT + interview_status lifecycle + candidate-facing text).
2. Session state / telemetry returned to clients.
3. Request bodies for the interview routes.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

# ──────────────────────────────────────────────
# 1. Groq output payload (CoT + lifecycle)
# ──────────────────────────────────────────────

Strategy = Literal["dig_deeper", "pivot", "simplify", "conclude"]


class ThoughtProcess(BaseModel):
    """Hidden 3-step Chain-of-Thought reasoning performed before any question."""

    evaluation: str = Field(default="", description="Analysis of the user's previous answer vs resume claims.")
    gaps_found: str = Field(default="", description="Technical depth missing or unverified resume claims.")
    strategy: Strategy = Field(default="pivot", description="dig_deeper | pivot | simplify | conclude")


class InterviewStatus(BaseModel):
    """Lifecycle bookkeeping echoed by the model (server re-enforces it)."""

    current_turn: int = 0
    max_turns: int = 5
    is_complete: bool = False
    completion_reason: str = "In-progress"


class CandidateResponse(BaseModel):
    """The only field ever shown to the candidate."""

    text: str = ""


class InterviewTurnPayload(BaseModel):
    """Strict JSON body returned by Groq for every interview turn."""

    thought_process: ThoughtProcess = Field(default_factory=ThoughtProcess)
    interview_status: InterviewStatus = Field(default_factory=InterviewStatus)
    response: CandidateResponse = Field(default_factory=CandidateResponse)


# ──────────────────────────────────────────────
# 2. Request bodies
# ──────────────────────────────────────────────

class StartInterviewRequest(BaseModel):
    """Parsed resume data from the /analyze step."""

    skills: list = []
    projects: list = []
    education: list = []
    experience: list = []


class AnswerRequest(BaseModel):
    """Candidate answer + context for the next interview turn."""

    answer: str
    current_question: str = ""
    conversation: list = []        # list of { role, content }
    resume_summary: str = ""
    question_number: int = 1       # advisory only — server-side turn_count is authoritative
    total_questions: int = 5       # advisory only — server-side MAX_QUESTIONS is authoritative
    session_id: Optional[str] = None  # server-side session state; auto-created if omitted


class FinishRequest(BaseModel):
    """Full transcript (and optionally a session id) for final evaluation."""

    transcript: list = []
    resume_summary: str = ""
    session_id: Optional[str] = None  # if present, stored CoT telemetry is merged into the report


# ──────────────────────────────────────────────
# 3. Response bodies
# ──────────────────────────────────────────────

class AnswerResponse(BaseModel):
    """
    Contract kept backward-compatible with the existing frontend:
    verdict / feedback / follow_up_question / next_question / is_complete,
    extended with session + CoT telemetry fields.
    """

    verdict: Literal["satisfied", "follow_up"]
    feedback: str = ""
    follow_up_question: Optional[str] = None
    next_question: Optional[str] = None
    is_complete: bool = False
    # ── lifecycle telemetry ──
    session_id: str
    turn_count: int
    max_questions: int
    strategy: Strategy
    completion_reason: str
    thought_process: ThoughtProcess
    interview_status: InterviewStatus


class TurnLog(BaseModel):
    """One stored CoT evaluation (telemetry used for the final report)."""

    turn_number: int
    strategy: str
    evaluation: str
    gaps_found: str
    is_complete: bool
    completion_reason: str
    response_text: str
    created_at: str


class SessionState(BaseModel):
    """GET /sessions/{id} — full persisted session state."""

    session_id: str
    status: Literal["active", "completed"]
    turn_count: int
    max_questions: int
    resume_summary: str
    completion_reason: Optional[str] = None
    created_at: str
    updated_at: str
    report: Optional[dict] = None
    logs: list[TurnLog] = []
