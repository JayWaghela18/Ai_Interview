"""
backend/session_store.py — SQLite-backed interview session state.

Persists per-session lifecycle state so the interview can terminate:
  sessions  → turn_count, status (active/completed), max_questions, closing statement, report
  turn_logs → one row per answer with the model's thought_process (CoT telemetry)

Uses only the stdlib (sqlite3) — no extra dependencies.
Thread-safe: guarded by an RLock so FastAPI's threadpool can share it.
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "interview_sessions.db"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SessionStore:
    """Small SQLite repository for interview sessions and their CoT logs."""

    def __init__(self, db_path: Optional[str | os.PathLike] = None):
        self.db_path = Path(
            db_path or os.environ.get("INTERVIEW_DB_PATH") or DEFAULT_DB_PATH
        )
        self._lock = threading.RLock()
        self._init_schema()

    # ── connection handling ──────────────────────

    @contextmanager
    def _conn(self):
        with self._lock:
            conn = sqlite3.connect(str(self.db_path), timeout=10)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
                conn.commit()
            finally:
                conn.close()

    def _init_schema(self) -> None:
        with self._conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id        TEXT PRIMARY KEY,
                    status            TEXT    NOT NULL DEFAULT 'active',
                    turn_count        INTEGER NOT NULL DEFAULT 0,
                    max_questions     INTEGER NOT NULL DEFAULT 5,
                    resume_summary    TEXT    NOT NULL DEFAULT '',
                    closing_statement TEXT,
                    completion_reason TEXT,
                    report_json       TEXT,
                    created_at        TEXT    NOT NULL,
                    updated_at        TEXT    NOT NULL
                );

                CREATE TABLE IF NOT EXISTS turn_logs (
                    id                INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id        TEXT    NOT NULL,
                    turn_number       INTEGER NOT NULL,
                    strategy          TEXT    NOT NULL DEFAULT '',
                    evaluation        TEXT    NOT NULL DEFAULT '',
                    gaps_found        TEXT    NOT NULL DEFAULT '',
                    is_complete       INTEGER NOT NULL DEFAULT 0,
                    completion_reason TEXT    NOT NULL DEFAULT '',
                    response_text     TEXT    NOT NULL DEFAULT '',
                    created_at        TEXT    NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
                );

                CREATE INDEX IF NOT EXISTS idx_turn_logs_session
                    ON turn_logs(session_id, turn_number);
                """
            )

    # ── session lifecycle ────────────────────────

    def create_session(self, resume_summary: str, max_questions: int) -> dict:
        session_id = uuid.uuid4().hex
        now = _now()
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO sessions
                    (session_id, status, turn_count, max_questions,
                     resume_summary, created_at, updated_at)
                VALUES (?, 'active', 0, ?, ?, ?, ?)
                """,
                (session_id, max_questions, resume_summary, now, now),
            )
        return self.get_session(session_id)  # type: ignore[return-value]

    def get_session(self, session_id: str) -> Optional[dict]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
            ).fetchone()
        return self._session_to_dict(row) if row else None

    def increment_turn(self, session_id: str) -> int:
        """+1 on every user response. Returns the new turn_count."""
        with self._conn() as conn:
            cur = conn.execute(
                """
                UPDATE sessions
                   SET turn_count = turn_count + 1, updated_at = ?
                 WHERE session_id = ?
                """,
                (_now(), session_id),
            )
            if cur.rowcount == 0:
                raise KeyError(f"Unknown session: {session_id}")
            row = conn.execute(
                "SELECT turn_count FROM sessions WHERE session_id = ?",
                (session_id,),
            ).fetchone()
        return int(row["turn_count"])

    def record_turn(
        self,
        session_id: str,
        turn_number: int,
        strategy: str,
        evaluation: str,
        gaps_found: str,
        is_complete: bool,
        completion_reason: str,
        response_text: str,
    ) -> None:
        """Store the model's thought_process for telemetry + final report."""
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO turn_logs
                    (session_id, turn_number, strategy, evaluation, gaps_found,
                     is_complete, completion_reason, response_text, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    turn_number,
                    strategy,
                    evaluation,
                    gaps_found,
                    1 if is_complete else 0,
                    completion_reason,
                    response_text,
                    _now(),
                ),
            )
            conn.execute(
                "UPDATE sessions SET updated_at = ? WHERE session_id = ?",
                (_now(), session_id),
            )

    def complete_session(
        self,
        session_id: str,
        closing_statement: str,
        completion_reason: str,
    ) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                UPDATE sessions
                   SET status = 'completed',
                       closing_statement = ?,
                       completion_reason = ?,
                       updated_at = ?
                 WHERE session_id = ?
                """,
                (closing_statement, completion_reason, _now(), session_id),
            )

    def save_report(self, session_id: str, report: dict) -> None:
        with self._conn() as conn:
            conn.execute(
                "UPDATE sessions SET report_json = ?, updated_at = ? WHERE session_id = ?",
                (json.dumps(report, ensure_ascii=False), _now(), session_id),
            )

    # ── reads ────────────────────────────────────

    def list_turn_logs(self, session_id: str) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT turn_number, strategy, evaluation, gaps_found,
                       is_complete, completion_reason, response_text, created_at
                  FROM turn_logs
                 WHERE session_id = ?
                 ORDER BY turn_number ASC
                """,
                (session_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def snapshot(self, session_id: str) -> Optional[dict]:
        """Session row + stored CoT logs (used by GET /sessions/{id})."""
        session = self.get_session(session_id)
        if session is None:
            return None
        session["logs"] = self.list_turn_logs(session_id)
        return session

    # ── helpers ──────────────────────────────────

    @staticmethod
    def _session_to_dict(row: sqlite3.Row) -> dict:
        d = dict(row)
        report_json = d.pop("report_json", None)
        d["report"] = json.loads(report_json) if report_json else None
        return d
