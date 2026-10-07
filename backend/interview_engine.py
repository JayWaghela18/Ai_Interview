"""
backend/interview_engine.py — Groq invocation + CoT prompt + lifecycle guardrails.

Responsibilities:
  1. Build the strict-JSON CoT system prompt (Step 1 spec) with the live
     CURRENT_QUESTION_NUM / MAX_QUESTIONS injected.
  2. Call Groq with response_format={"type": "json_object"} and parse the reply
     into a validated InterviewTurnPayload (Pydantic).
  3. Enforce termination server-side: the model can conclude early, but it can
     NEVER exceed MAX_QUESTIONS — and a malformed reply at the limit still
     produces a conclusion instead of an endless loop.
  4. Generate the final candidate report from stored thought_process logs.
"""

from __future__ import annotations

import json
import os
from typing import Optional

from groq import Groq

try:  # works both as `backend.interview_engine` and as a flat module
    from .schemas import (
        CandidateResponse,
        InterviewStatus,
        InterviewTurnPayload,
        ThoughtProcess,
    )
except ImportError:  # pragma: no cover - flat import (uvicorn main:app)
    from schemas import (  # type: ignore
        CandidateResponse,
        InterviewStatus,
        InterviewTurnPayload,
        ThoughtProcess,
    )

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
# NOTE: llama-3.3-70b-versatile was decommissioned on Groq's free tier
# (Aug 16, 2026). Default to a currently-served model; override via GROQ_MODEL.
MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
MAX_QUESTIONS = int(os.environ.get("MAX_QUESTIONS", "5"))

RESUME_CONTEXT_LIMIT = 6000  # chars of resume text injected into the prompt
HISTORY_WINDOW = 12          # prior chat messages sent as context


class InvalidAIResponseError(Exception):
    """Groq returned something that could not be parsed as the strict JSON payload."""


class GroqCallError(Exception):
    """The Groq API call itself failed (network, auth, rate limit)."""


# ──────────────────────────────────────────────
# 1. SYSTEM PROMPT (strict CoT contract)
# ──────────────────────────────────────────────

SYSTEM_PROMPT_TEMPLATE = """You are an expert AI Technical Interviewer evaluating a candidate based on their uploaded Resume.

CRITICAL INSTRUCTION - YOU MUST FOLLOW THIS DUAL-STAGE PROCESS:
Before formulating any candidate-facing text, you MUST perform hidden Chain-of-Thought (CoT) reasoning.

INTERVIEW CONFIGURATION:
- Maximum Questions Allowed: {MAX_QUESTIONS} (Current Question #: {CURRENT_QUESTION_NUM})
- Resume Context: {RESUME_TEXT}

EVALUATION RULES:
1. If CURRENT_QUESTION_NUM < MAX_QUESTIONS and topics remain:
   - Perform CoT analysis on the user's latest response.
   - Choose a strategy:
     * "dig_deeper": Answer was surface-level/basic. Ask for edge cases or specific technical details.
     * "pivot": Answer demonstrated full mastery. Move to a new project or skill on their resume.
     * "simplify": Candidate struggled or was stuck. Offer a subtle hint without giving away the answer.
   - Set "is_complete" to false.

2. If CURRENT_QUESTION_NUM >= MAX_QUESTIONS OR the candidate has adequately covered all major technical skills on their resume:
   - Set strategy to "conclude".
   - Set "is_complete" to true.
   - Do NOT ask another question. Instead, provide a brief, professional wrap-up thanking the candidate and informing them that their interview evaluation is complete.

OUTPUT FORMAT (STRICT JSON ONLY):
{{
  "thought_process": {{
    "evaluation": "Detailed analysis of user's previous answer based on resume claims.",
    "gaps_found": "Specific technical depth missing or unverified claims.",
    "strategy": "dig_deeper | pivot | simplify | conclude"
  }},
  "interview_status": {{
    "current_turn": {CURRENT_QUESTION_NUM},
    "max_turns": {MAX_QUESTIONS},
    "is_complete": true_or_false,
    "completion_reason": "In-progress | Max questions reached | Full resume scope evaluated"
  }},
  "response": {{
    "text": "The candidate-facing question OR final closing statement."
  }}
}}"""


def build_system_prompt(
    resume_text: str,
    current_question_num: int,
    max_questions: int = MAX_QUESTIONS,
) -> str:
    """Fill the Step-1 template with live session state."""
    resume_text = (resume_text or "").strip() or "(Resume not provided)"
    if len(resume_text) > RESUME_CONTEXT_LIMIT:
        resume_text = resume_text[:RESUME_CONTEXT_LIMIT] + " …[truncated]"
    return SYSTEM_PROMPT_TEMPLATE.format(
        MAX_QUESTIONS=max_questions,
        CURRENT_QUESTION_NUM=current_question_num,
        RESUME_TEXT=resume_text,
    )


def build_user_message(answer: str, conversation: list, turn_number: int) -> str:
    """Latest answer + trimmed conversation history as the user turn."""
    history = [m for m in (conversation or []) if isinstance(m, dict)]
    # The frontend appends the answer to `conversation` before calling us — drop the duplicate.
    if (
        history
        and history[-1].get("role") == "user"
        and str(history[-1].get("content", "")).strip() == answer.strip()
    ):
        history = history[:-1]
    history = history[-HISTORY_WINDOW:]

    history_text = json.dumps(history, indent=2, ensure_ascii=False) if history else "(none)"
    return (
        f"CANDIDATE'S LATEST RESPONSE (their answer to question #{turn_number}):\n"
        f"\"\"\"\n{answer}\n\"\"\"\n\n"
        f"CONVERSATION SO FAR:\n{history_text}\n\n"
        "Remember: perform your hidden Chain-of-Thought reasoning first, then reply with "
        "ONLY the strict JSON object defined in the system prompt."
    )


# ──────────────────────────────────────────────
# 2. Groq invocation + parsing
# ──────────────────────────────────────────────

def _chat_once(client: Groq, messages: list, model: str) -> str:
    completion = client.chat.completions.create(
        messages=messages,
        model=model,
        response_format={"type": "json_object"},  # forces valid JSON output
        temperature=0.4,
    )
    content = completion.choices[0].message.content
    if not content:
        raise InvalidAIResponseError("Groq returned an empty message.")
    return content


def _parse_payload(raw: str) -> InterviewTurnPayload:
    try:
        payload = InterviewTurnPayload.model_validate_json(raw)
    except Exception as e:
        raise InvalidAIResponseError(f"Response did not match strict JSON schema: {e}") from e
    if not payload.response.text.strip():
        raise InvalidAIResponseError("Response text is empty — no candidate-facing content.")
    return payload


def run_interview_turn(
    client: Groq,
    *,
    system_prompt: str,
    answer: str,
    conversation: list,
    turn_count: int,
    max_questions: int = MAX_QUESTIONS,
    model: Optional[str] = None,
) -> InterviewTurnPayload:
    """
    One full interview turn: call Groq → parse strict JSON → validate →
    re-enforce lifecycle guardrails (server is the source of truth).
    """
    model = model or MODEL
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": build_user_message(answer, conversation, turn_count)},
    ]

    last_error: Optional[InvalidAIResponseError] = None
    raw = ""
    for attempt in (1, 2):  # one corrective retry on malformed output
        try:
            raw = _chat_once(client, messages, model)
        except InvalidAIResponseError as e:
            last_error = e
        except Exception as api_error:
            raise GroqCallError(str(api_error)) from api_error
        else:
            try:
                payload = _parse_payload(raw)
            except InvalidAIResponseError as e:
                last_error = e
            else:
                return enforce_lifecycle(payload, turn_count, max_questions)

        print(f"⚠️ interview_engine — invalid reply (attempt {attempt}/2): {last_error}")
        messages = messages + [
            {"role": "assistant", "content": raw},
            {
                "role": "user",
                "content": (
                    "CRITICAL: That was not the required strict JSON object. "
                    "Output ONLY the JSON object with thought_process, interview_status "
                    "and response as defined in the system prompt."
                ),
            },
        ]

    # Both attempts failed to produce usable JSON → termination guardrail
    return _fallback_payload(last_error, turn_count, max_questions)


def _fallback_payload(
    error: Exception,
    turn_count: int,
    max_questions: int,
) -> InterviewTurnPayload:
    """
    Termination guardrail: if the model never produces valid JSON, we must still
    not loop forever. At (or past) the limit we conclude locally; below it we fail
    loudly so the route can return a 502 instead of hallucinating a question.
    """
    if turn_count >= max_questions:
        print(f"⚠️ interview_engine — synthesizing conclusion after invalid reply: {error}")
        return build_closing_payload(turn_count, max_questions)
    raise InvalidAIResponseError(str(error)) from error


def enforce_lifecycle(
    payload: InterviewTurnPayload,
    turn_count: int,
    max_questions: int = MAX_QUESTIONS,
) -> InterviewTurnPayload:
    """
    Server-side guardrails — the model's opinion about `is_complete` is advisory:
      * turn_count >= MAX  → force conclude / is_complete = true
      * strategy conclude  → is_complete = true
      * is_complete        → strategy must be conclude
      * counters are always overwritten with the real session state
    """
    status = payload.interview_status
    thought = payload.thought_process

    status.current_turn = turn_count
    status.max_turns = max_questions

    if turn_count >= max_questions:
        if not status.is_complete:
            # Model failed to stop — swap any newly-asked question for a real closing.
            payload.response.text = DEFAULT_CLOSING
        status.is_complete = True
        thought.strategy = "conclude"
        status.completion_reason = "Max questions reached"
    else:
        if thought.strategy == "conclude":
            status.is_complete = True
            if not status.completion_reason.strip() or status.completion_reason == "In-progress":
                status.completion_reason = "Full resume scope evaluated"
        elif status.is_complete:
            thought.strategy = "conclude"
            if not status.completion_reason.strip() or status.completion_reason == "In-progress":
                status.completion_reason = "Full resume scope evaluated"
        else:
            status.completion_reason = "In-progress"

    return payload


DEFAULT_CLOSING = (
    "Thank you for your time today — that concludes our interview. "
    "Your evaluation is complete and your feedback report is being prepared."
)


def build_closing_payload(
    turn_count: int,
    max_questions: int = MAX_QUESTIONS,
) -> InterviewTurnPayload:
    """Locally-synthesized conclusion (used when Groq output is unusable at the limit)."""
    return InterviewTurnPayload(
        thought_process=ThoughtProcess(
            evaluation="Model output could not be parsed; concluding on the server-side question limit.",
            gaps_found="Not assessed — turn limit reached.",
            strategy="conclude",
        ),
        interview_status=InterviewStatus(
            current_turn=turn_count,
            max_turns=max_questions,
            is_complete=True,
            completion_reason="Max questions reached",
        ),
        response=CandidateResponse(text=DEFAULT_CLOSING),
    )


# ──────────────────────────────────────────────
# 3. Final report from stored thought_process logs
# ──────────────────────────────────────────────

def format_cot_logs(logs: list[dict]) -> str:
    """Render stored turn_logs as readable telemetry for the report prompt."""
    if not logs:
        return "(No per-turn telemetry was stored for this session.)"
    blocks = []
    for log in logs:
        blocks.append(
            f"Turn {log.get('turn_number')} [strategy={log.get('strategy')}]\n"
            f"  Evaluation: {log.get('evaluation', '')}\n"
            f"  Gaps found: {log.get('gaps_found', '')}"
        )
    return "\n".join(blocks)


def generate_final_report(
    client: Groq,
    *,
    resume_summary: str,
    logs: list[dict],
    transcript: Optional[str] = None,
    model: Optional[str] = None,
) -> dict:
    """
    Build the candidate's final evaluation report from the stored CoT
    thought_process logs (plus the transcript when available).
    """
    model = model or MODEL
    transcript_section = (
        f"\nFull Interview Transcript:\n{transcript}\n" if transcript else ""
    )

    prompt = f"""You are Nova, an expert AI interview evaluator. Analyze this completed interview and produce a comprehensive evaluation.

Candidate's resume:
{resume_summary}

Per-turn Chain-of-Thought telemetry captured by the interviewer (evaluation + gaps found for each answer):
{format_cot_logs(logs)}
{transcript_section}
Return ONLY a JSON object with these exact fields:
- "overall_score": integer 0-100 representing overall interview performance
- "clarity_score": integer 0-100 for communication clarity
- "structure_score": integer 0-100 for answer structure (STAR method, logical flow)
- "confidence_score": integer 0-100 for confidence and delivery
- "strengths": array of exactly 3 strings describing specific strengths (reference the telemetry)
- "weaknesses": array of exactly 3 strings describing specific areas to improve (be constructive)
- "improvements": array of exactly 3 strings with actionable improvement tips
- "summary": a 3-4 sentence paragraph summarizing the candidate's overall performance
- "score_label": one of "Exceptional", "Strong", "Good", "Developing", or "Needs Work"

Be fair but encouraging. Ground your feedback in the per-turn evaluations above."""

    completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model=model,
        response_format={"type": "json_object"},
        temperature=0.4,
    )
    content = completion.choices[0].message.content or ""
    return json.loads(content)
