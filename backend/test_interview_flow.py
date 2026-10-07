"""
backend/test_interview_flow.py — lifecycle tests for the refactored AI Interviewer.

Covers:
  * session state tracking (turn_count +1 per response)
  * strict JSON CoT payload parsing (Pydantic)
  * termination at MAX_QUESTIONS even when the model disobeys
  * model-initiated early conclusion
  * dig_deeper → follow_up mapping (frontend contract)
  * invalid-JSON guardrails (502 below the limit, forced conclusion at it)
  * stored thought_process telemetry + background report generation

Run:  cd backend && python test_interview_flow.py
(Groq is faked — no network or real API key required.)
"""

from __future__ import annotations

import json
import os
import re
import sys
import tempfile
import unittest
from types import SimpleNamespace

# ── Environment must be prepared BEFORE importing main ──
os.environ.setdefault("GROQ_API_KEY", "test-key-dummy")
os.environ.setdefault(
    "INTERVIEW_DB_PATH",
    os.path.join(tempfile.mkdtemp(prefix="interview-test-"), "sessions.db"),
)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:  # pragma: no cover
        pass

import main  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from interview_engine import (  # noqa: E402
    DEFAULT_CLOSING,
    build_system_prompt,
    enforce_lifecycle,
)
from schemas import InterviewTurnPayload  # noqa: E402

REPORT = {
    "overall_score": 88,
    "clarity_score": 85,
    "structure_score": 90,
    "confidence_score": 80,
    "strengths": ["Clear structure", "Strong Python depth", "Good examples"],
    "weaknesses": ["Could quantify impact", "Depth on scaling", "Conciseness"],
    "improvements": ["Use STAR", "Add metrics", "Practice concise answers"],
    "summary": "Solid performance with strong fundamentals.",
    "score_label": "Strong",
}


def cot_payload(
    current_turn: int,
    max_turns: int,
    strategy: str = "pivot",
    is_complete: bool = False,
    reason: str = "In-progress",
    text: str | None = None,
) -> str:
    """Build the exact strict-JSON shape the system prompt demands."""
    if text is None:
        text = (
            "Thank you — your evaluation is complete."
            if is_complete
            else f"Question for turn {current_turn}: what edge cases would you handle?"
        )
    return json.dumps(
        {
            "thought_process": {
                "evaluation": f"Analysis of answer on turn {current_turn}.",
                "gaps_found": "Missing metrics on impact.",
                "strategy": strategy,
            },
            "interview_status": {
                "current_turn": current_turn,
                "max_turns": max_turns,
                "is_complete": is_complete,
                "completion_reason": reason,
            },
            "response": {"text": text},
        }
    )


class FakeGroq:
    """Scripted stand-in for the Groq client (no network)."""

    def __init__(self, cot_behavior=None):
        # cot_behavior(n, maxq) -> str | dict  (the strict JSON reply)
        self.cot_behavior = cot_behavior or (
            lambda n, maxq: cot_payload(n, maxq, strategy="pivot")
        )
        self.calls: list[dict] = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        text = "\n".join(m["content"] for m in kwargs["messages"])

        if "expert AI Technical Interviewer" in text:
            system_prompt = next(
                m["content"] for m in kwargs["messages"] if m["role"] == "system"
            )
            n = int(re.search(r"Current Question #: (\d+)", system_prompt).group(1))
            maxq = int(re.search(r"Maximum Questions Allowed: (\d+)", system_prompt).group(1))
            content = self.cot_behavior(n, maxq)
            if isinstance(content, dict):
                content = json.dumps(content)
        elif "expert AI interview evaluator" in text:
            content = json.dumps(REPORT)
        elif "ATS (Applicant Tracking System)" in text:
            content = json.dumps(
                {"skills": ["Python"], "projects": [], "education": [], "experience": []}
            )
        else:  # /start-interview
            content = json.dumps(
                {"greeting": "Hi! Welcome.", "question": "Tell me about your biggest project."}
            )

        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
        )


class InterviewLifecycleTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        self.groq = FakeGroq()
        self._original_client = main.client
        main.client = self.groq

    def tearDown(self):
        main.client = self._original_client

    # ── helpers ────────────────────────────────

    def _start(self) -> dict:
        r = self.client.post(
            "/start-interview",
            json={"skills": ["Python"], "projects": [], "education": [], "experience": []},
        )
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertIn("session_id", data)
        self.assertEqual(data["turn_count"], 0)
        self.assertEqual(data["max_questions"], 5)
        return data

    def _answer(self, session_id: str, text: str = "I used a cache with TTL invalidation."):
        return self.client.post(
            "/answer",
            json={
                "answer": text,
                "current_question": "Q?",
                "conversation": [{"role": "user", "content": text}],
                "resume_summary": "Senior Python engineer",
                "question_number": 1,
                "total_questions": 5,
                "session_id": session_id,
            },
        )

    # ── 1. Full lifecycle, model NEVER concludes ──────────────

    def test_terminates_at_max_questions_even_if_model_disobeys(self):
        started = self._start()
        sid = started["session_id"]

        for i in range(1, 5):
            r = self._answer(sid, f"answer {i}")
            self.assertEqual(r.status_code, 200, r.text)
            d = r.json()
            self.assertFalse(d["is_complete"])
            self.assertEqual(d["turn_count"], i)
            self.assertEqual(d["strategy"], "pivot")
            self.assertEqual(d["verdict"], "satisfied")
            self.assertIsNotNone(d["next_question"])

        # 5th answer: model STILL asks a question (is_complete=false) → server forces stop
        r = self._answer(sid, "answer 5")
        self.assertEqual(r.status_code, 200, r.text)
        d = r.json()
        self.assertTrue(d["is_complete"])
        self.assertEqual(d["strategy"], "conclude")
        self.assertEqual(d["completion_reason"], "Max questions reached")
        self.assertEqual(d["next_question"], DEFAULT_CLOSING)

        # Session marked completed + telemetry stored
        state = self.client.get(f"/sessions/{sid}").json()
        self.assertEqual(state["status"], "completed")
        self.assertEqual(state["turn_count"], 5)
        self.assertEqual(len(state["logs"]), 5)
        self.assertEqual([log["strategy"] for log in state["logs"]],
                         ["pivot", "pivot", "pivot", "pivot", "conclude"])

        # Background report generated from stored thought_process logs
        self.assertIsNotNone(state["report"], "final report should be generated")
        self.assertEqual(state["report"]["overall_score"], 88)

        # A late answer after completion must NOT reopen or extend the interview
        r = self._answer(sid, "one more answer")
        d = r.json()
        self.assertTrue(d["is_complete"])
        self.assertEqual(d["turn_count"], 5)
        self.assertEqual(len(self.client.get(f"/sessions/{sid}").json()["logs"]), 5)

    # ── 2. Model concludes early ──────────────────────────────

    def test_model_initiated_early_completion(self):
        def behavior(n, maxq):
            if n >= 2:
                return cot_payload(
                    n, maxq, strategy="conclude", is_complete=True,
                    reason="Full resume scope evaluated",
                    text="Thanks — that wraps up our interview!",
                )
            return cot_payload(n, maxq, strategy="pivot")

        main.client = FakeGroq(behavior)
        sid = self._start()["session_id"]

        self.assertFalse(self._answer(sid).json()["is_complete"])
        d = self._answer(sid).json()
        self.assertTrue(d["is_complete"])
        self.assertEqual(d["strategy"], "conclude")
        self.assertEqual(d["next_question"], "Thanks — that wraps up our interview!")
        self.assertEqual(d["completion_reason"], "Full resume scope evaluated")

        state = self.client.get(f"/sessions/{sid}").json()
        self.assertEqual(state["status"], "completed")
        self.assertEqual(state["turn_count"], 2)
        self.assertEqual(len(state["logs"]), 2)

    # ── 3. dig_deeper maps to the frontend's follow_up contract ──

    def test_dig_deeper_maps_to_follow_up(self):
        main.client = FakeGroq(
            lambda n, maxq: cot_payload(n, maxq, strategy="dig_deeper")
        )
        sid = self._start()["session_id"]
        d = self._answer(sid).json()
        self.assertEqual(d["verdict"], "follow_up")
        self.assertIsNotNone(d["follow_up_question"])
        self.assertIsNone(d["next_question"])
        self.assertFalse(d["is_complete"])
        self.assertEqual(d["turn_count"], 1)

    # ── 4. Invalid JSON guardrails ────────────────────────────

    def test_invalid_json_below_limit_returns_502(self):
        main.client = FakeGroq(lambda n, maxq: "this is not json")
        sid = self._start()["session_id"]
        r = self._answer(sid)
        self.assertEqual(r.status_code, 502)
        # Session still active — the interview is not falsely terminated
        self.assertEqual(self.client.get(f"/sessions/{sid}").json()["status"], "active")

    def test_invalid_json_at_limit_still_terminates(self):
        main.client = FakeGroq(lambda n, maxq: "this is not json")
        sid = self._start()["session_id"]

        for i in range(1, 5):
            self.assertEqual(self._answer(sid).status_code, 502)

        # 5th response: turn_count >= MAX → locally synthesized conclusion
        r = self._answer(sid)
        self.assertEqual(r.status_code, 200, r.text)
        d = r.json()
        self.assertTrue(d["is_complete"])
        self.assertEqual(d["completion_reason"], "Max questions reached")
        self.assertEqual(d["next_question"], DEFAULT_CLOSING)
        self.assertEqual(self.client.get(f"/sessions/{sid}").json()["status"], "completed")

    # ── 5. /finish uses stored report / merges telemetry ──────

    def test_finish_returns_stored_report(self):
        def behavior(n, maxq):
            if n >= 2:
                return cot_payload(n, maxq, strategy="conclude", is_complete=True)
            return cot_payload(n, maxq)

        main.client = FakeGroq(behavior)
        sid = self._start()["session_id"]
        self._answer(sid)
        self._answer(sid)  # completes → background report stored

        calls_before = len(self.groq.calls)
        r = self.client.post(
            "/finish",
            json={
                "transcript": [{"who": "AI", "text": "Q"}, {"who": "You", "text": "A"}],
                "resume_summary": "Senior Python engineer",
                "session_id": sid,
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["overall_score"], 88)
        # Stored report short-circuits a second Groq call
        self.assertEqual(len(self.groq.calls), calls_before)

    def test_finish_merges_cot_telemetry_when_no_stored_report(self):
        """Background report task unavailable (e.g. serverless) → /finish rebuilds from logs."""
        sid = self._start()["session_id"]
        self._answer(sid)  # 1 turn logged, session still active → no report yet

        r = self.client.post(
            "/finish",
            json={
                "transcript": [{"who": "AI", "text": "Q"}, {"who": "You", "text": "A"}],
                "resume_summary": "Senior Python engineer",
                "session_id": sid,
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["overall_score"], 88)

        # The CoT telemetry must actually be merged into the report prompt
        last_prompt = " ".join(m["content"] for m in self.groq.calls[-1]["messages"])
        self.assertIn("Per-turn Chain-of-Thought telemetry", last_prompt)
        self.assertIn("Missing metrics on impact", last_prompt)

        # And the report is persisted on the session
        state = self.client.get(f"/sessions/{sid}").json()
        self.assertIsNotNone(state["report"])

    # ── 6. Unit: lifecycle enforcement + prompt injection ─────

    def test_enforce_lifecycle_overrides_model_counters(self):
        payload = InterviewTurnPayload.model_validate_json(
            cot_payload(99, 999, strategy="pivot", is_complete=False)
        )
        out = enforce_lifecycle(payload, turn_count=3, max_questions=5)
        self.assertEqual(out.interview_status.current_turn, 3)
        self.assertEqual(out.interview_status.max_turns, 5)
        self.assertFalse(out.interview_status.is_complete)
        self.assertEqual(out.interview_status.completion_reason, "In-progress")

        out = enforce_lifecycle(payload, turn_count=5, max_questions=5)
        self.assertTrue(out.interview_status.is_complete)
        self.assertEqual(out.thought_process.strategy, "conclude")
        self.assertEqual(out.response.text, DEFAULT_CLOSING)

        early = InterviewTurnPayload.model_validate_json(
            cot_payload(2, 5, strategy="conclude", is_complete=True)
        )
        out = enforce_lifecycle(early, turn_count=2, max_questions=5)
        self.assertTrue(out.interview_status.is_complete)
        self.assertEqual(out.interview_status.completion_reason, "Full resume scope evaluated")

    def test_system_prompt_injects_live_counters(self):
        prompt = build_system_prompt("Jane Doe — Python engineer", 3, 5)
        self.assertIn("Maximum Questions Allowed: 5 (Current Question #: 3)", prompt)
        self.assertIn("Jane Doe — Python engineer", prompt)
        self.assertIn('"strategy": "dig_deeper | pivot | simplify | conclude"', prompt)


if __name__ == "__main__":
    unittest.main(verbosity=2)
