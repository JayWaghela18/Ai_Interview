import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  Volume2,
  VolumeX,
  ChevronRight,
  Circle,
  Clock,
  Loader2,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { RobotMascot } from "@/components/robot/RobotMascot";

export const Route = createFileRoute("/interview")({
  component: InterviewPage,
  head: () => ({
    meta: [
      { title: "Live Interview — InterviewAI" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface TranscriptEntry {
  who: "AI" | "You";
  text: string;
  type?: "greeting" | "question" | "feedback" | "follow_up" | "answer";
}

const TOTAL_QUESTIONS = 5;

// ──────────────────────────────────────────────
// SpeechRecognition polyfill type
// ──────────────────────────────────────────────
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

function getSpeechRecognition(): (new () => ISpeechRecognition) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// ──────────────────────────────────────────────
// Helper: Speak text using the browser Speech API
// ──────────────────────────────────────────────
function speakText(text: string, onEnd?: () => void): SpeechSynthesisUtterance | null {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang.startsWith("en") && v.name.includes("Female")
  ) || voices.find((v) => v.lang.startsWith("en"));
  if (preferred) utterance.voice = preferred;

  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
  return utterance;
}


const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:8000");

function InterviewPage() {
  const navigate = useNavigate();

  // ── Core state ──
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [answer, setAnswer] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resumeSummary, setResumeSummary] = useState("");
  const [conversation, setConversation] = useState<{ role: string; content: string }[]>([]);

  // ── Speech state ──
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [recording, setRecording] = useState(false);
  const [interimText, setInterimText] = useState("");

  // ── Answer evaluation state ──
  const [lastVerdict, setLastVerdict] = useState<"satisfied" | "follow_up" | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Timer ──
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Auto-scroll transcript ──
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript]);

  // ── Load voices ──
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  // ──────────────────────────────────────────────
  // SpeechRecognition: Start / Stop voice recording
  // ──────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setTranscript((t) => [
        ...t,
        { who: "AI", text: "⚠️ Your browser doesn't support voice input. Please type your answer instead." },
      ]);
      return;
    }

    // Stop any ongoing speech so the mic can listen
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("🎙️ Recording started");
      setRecording(true);
      setInterimText("");
    };

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setAnswer((prev) => (prev ? prev + " " : "") + final);
        setInterimText("");
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event) => {
      console.error("🎙️ Recognition error:", event.error);
      if (event.error !== "aborted") {
        setRecording(false);
      }
    };

    recognition.onend = () => {
      console.log("🎙️ Recording ended");
      setRecording(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
    setInterimText("");
  }, []);

  const toggleRecording = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  // ──────────────────────────────────────────────
  // On mount: Start interview
  // ──────────────────────────────────────────────
  useEffect(() => {
    const startInterview = async () => {
      const stored = sessionStorage.getItem("parsedResume");
      if (!stored) {
        navigate({ to: "/upload" });
        return;
      }

      const parsedResume = JSON.parse(stored);
      console.log("📋 Resume data loaded:", parsedResume);

      try {
        const res = await fetch(`${API_URL}/start-interview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedResume),
        });

        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.detail || "Failed to start interview");
        }

        const data = await res.json();
        console.log("🎤 Interview started:", data);

        // Persist server-side session id (turn_count lifecycle) for /answer calls
        if (data.session_id) sessionStorage.setItem("interviewSessionId", data.session_id);

        setResumeSummary(data.resume_summary);
        setCurrentQuestion(data.question);
        setTranscript([
          { who: "AI", text: data.greeting, type: "greeting" },
          { who: "AI", text: data.question, type: "question" },
        ]);
        setConversation([
          { role: "assistant", content: data.greeting },
          { role: "assistant", content: data.question },
        ]);

        if (speechEnabled) {
          setIsSpeaking(true);
          speakText(data.greeting + " " + data.question, () => setIsSpeaking(false));
        }

        setLoading(false);
      } catch (err) {
        console.error("❌ Failed to start interview:", err);
        setTranscript([{ who: "AI", text: "Sorry, I couldn't start the interview. Please go back and try again." }]);
        setLoading(false);
      }
    };

    startInterview();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────
  // Submit answer → call /answer for evaluation
  // ──────────────────────────────────────────────
  const submitAnswer = useCallback(async () => {
    if (!answer.trim() || submitting) return;

    // Stop recording if still active
    if (recording) stopRecording();

    const userAnswer = answer.trim();
    setAnswer("");
    setInterimText("");
    setSubmitting(true);
    setLastVerdict(null);

    // Add to transcript
    setTranscript((t) => [...t, { who: "You", text: userAnswer, type: "answer" }]);
    const updatedConversation = [...conversation, { role: "user", content: userAnswer }];
    setConversation(updatedConversation);

    try {
      // ── Call /answer for evaluation ──
      const res = await fetch(`${API_URL}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: userAnswer,
          current_question: currentQuestion,
          conversation: updatedConversation,
          resume_summary: resumeSummary,
          question_number: questionNumber,
          total_questions: TOTAL_QUESTIONS,
          session_id: sessionStorage.getItem("interviewSessionId") || null,
        }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || "Failed to evaluate answer");
      }

      const data = await res.json();
      // data = { verdict, feedback, follow_up_question, next_question, is_complete }
      console.log(`🤖 Q${questionNumber} verdict: ${data.verdict}`, data);
      setLastVerdict(data.verdict);

      // Add AI feedback to transcript
      if (data.feedback) {
        setTranscript((t) => [...t, { who: "AI", text: data.feedback, type: "feedback" }]);
        setConversation((c) => [...c, { role: "assistant", content: data.feedback }]);
      }

      if (data.verdict === "follow_up" && data.follow_up_question) {
        // ── FOLLOW-UP: Answer was too brief — probe deeper ──
        setTranscript((t) => [
          ...t,
          { who: "AI", text: data.follow_up_question, type: "follow_up" },
        ]);
        setConversation((c) => [...c, { role: "assistant", content: data.follow_up_question }]);
        setCurrentQuestion(data.follow_up_question);
        // Don't increment question number — we stay on the same question

        if (speechEnabled) {
          setIsSpeaking(true);
          const text = (data.feedback ? data.feedback + " " : "") + data.follow_up_question;
          speakText(text, () => setIsSpeaking(false));
        }
      } else if (data.is_complete) {
        // ── COMPLETE: Interview is done ──
        if (data.next_question) {
          setTranscript((t) => [...t, { who: "AI", text: data.next_question, type: "greeting" }]);
        }

        if (speechEnabled) {
          setIsSpeaking(true);
          const closingText = (data.feedback || "") + (data.next_question ? " " + data.next_question : "");
          speakText(closingText, () => {
            setIsSpeaking(false);
            sessionStorage.setItem("interviewTranscript", JSON.stringify(transcript));
            navigate({ to: "/results" });
          });
        } else {
          sessionStorage.setItem("interviewTranscript", JSON.stringify(transcript));
          setTimeout(() => navigate({ to: "/results" }), 2000);
        }
      } else {
        // ── SATISFIED: Move to next question ──
        if (data.next_question) {
          setTranscript((t) => [...t, { who: "AI", text: data.next_question, type: "question" }]);
          setConversation((c) => [...c, { role: "assistant", content: data.next_question }]);
          setCurrentQuestion(data.next_question);
          setQuestionNumber((n) => n + 1);

          if (speechEnabled) {
            setIsSpeaking(true);
            const fullText = (data.feedback ? data.feedback + " " : "") + data.next_question;
            speakText(fullText, () => setIsSpeaking(false));
          }
        }
      }
    } catch (err) {
      console.error("❌ Error evaluating answer:", err);
      setTranscript((t) => [
        ...t,
        { who: "AI", text: "Sorry, something went wrong. Please try answering again." },
      ]);
    } finally {
      setSubmitting(false);
    }
  }, [answer, submitting, recording, stopRecording, conversation, currentQuestion, resumeSummary, questionNumber, speechEnabled, transcript, navigate]);

  // ──────────────────────────────────────────────
  // Toggle speech on/off
  // ──────────────────────────────────────────────
  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setSpeechEnabled((prev) => !prev);
  };

  const progress = (questionNumber / TOTAL_QUESTIONS) * 100;

  // ── Verdict badge helper ──
  const verdictBadge = lastVerdict ? (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${lastVerdict === "satisfied"
        ? "bg-emerald-500/20 text-emerald-400"
        : "bg-amber-500/20 text-amber-400"
        }`}
    >
      {lastVerdict === "satisfied" ? (
        <>
          <ArrowRight className="h-3 w-3" /> Great answer — moving on
        </>
      ) : (
        <>
          <MessageCircle className="h-3 w-3" /> Let's dig deeper
        </>
      )}
    </motion.div>
  ) : null;

  return (
    <PageShell>
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* LEFT — Robot + status */}
        <aside className="order-2 lg:order-1">
          <div className="glass-strong sticky top-28 rounded-3xl p-5">
            <div className="flex justify-center">
              <RobotMascot size={240} speaking={isSpeaking} showParticles={false} />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs">
              <motion.span
                className={`h-1.5 w-1.5 rounded-full ${recording ? "bg-red-500" : "bg-[var(--neon-cyan)]"
                  }`}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: recording ? 0.6 : 1.4, repeat: Infinity }}
              />
              <span className="text-muted-foreground">
                {loading
                  ? "Preparing…"
                  : recording
                    ? "🎙️ Listening to you…"
                    : isSpeaking
                      ? "Nova is speaking"
                      : "Ready for your answer"}
              </span>
              <button
                onClick={toggleSpeech}
                className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={speechEnabled ? "Mute voice" : "Unmute voice"}
              >
                {speechEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {recording
                ? "Speak clearly · Click mic again to stop"
                : `Voice ${speechEnabled ? "active" : "muted"} · Powered by Groq AI`}
            </p>

            {/* Verdict indicator */}
            <div className="mt-3 flex justify-center">{verdictBadge}</div>
          </div>
        </aside>

        {/* CENTER — Question + input */}
        <div className="order-1 lg:order-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Question <span className="text-foreground">{questionNumber}</span> of {TOTAL_QUESTIONS}
              {lastVerdict === "follow_up" && (
                <span className="ml-2 text-amber-400">(follow-up)</span>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> {mm}:{ss}
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-[image:var(--gradient-primary)]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-strong relative mt-6 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl p-12"
              >
                <Loader2 className="h-8 w-8 animate-spin text-[var(--neon-cyan)]" />
                <p className="text-sm text-muted-foreground">Nova is preparing your interview…</p>
              </motion.div>
            ) : (
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className={`glass-strong relative mt-6 overflow-hidden rounded-3xl p-8 ${lastVerdict === "follow_up" ? "ring-1 ring-amber-500/30" : ""
                  }`}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 opacity-30"
                  style={{ background: "var(--gradient-aurora)" }}
                />
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <Circle
                    className={`h-2 w-2 ${lastVerdict === "follow_up"
                      ? "fill-amber-400 text-amber-400"
                      : "fill-[var(--neon-cyan)] text-[var(--neon-cyan)]"
                      }`}
                  />
                  {lastVerdict === "follow_up" ? "Nova wants to know more" : "Nova asks"}
                </div>
                <h2 className="mt-3 font-display text-2xl font-medium leading-snug sm:text-3xl">
                  {currentQuestion}
                </h2>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom composer */}
          <div className="glass-strong mt-6 rounded-3xl p-4">
            {/* Show interim speech text if recording */}
            {recording && interimText && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-3 rounded-xl bg-white/[0.04] px-4 py-2 text-xs italic text-muted-foreground"
              >
                🎙️ {interimText}
              </motion.p>
            )}
            <div className="flex items-end gap-3">
              <motion.button
                onClick={toggleRecording}
                whileTap={{ scale: 0.94 }}
                disabled={loading || submitting}
                className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${recording
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-[image:var(--gradient-primary)] text-primary-foreground"
                  }`}
                aria-label={recording ? "Stop recording" : "Start recording"}
              >
                <Mic className="h-6 w-6" />
                {recording && (
                  <>
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-destructive"
                      animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    />
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-destructive"
                      animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
                    />
                  </>
                )}
              </motion.button>
              <div className="min-w-0 flex-1">
                <textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitAnswer();
                    }
                  }}
                  disabled={loading || submitting}
                  placeholder={
                    submitting
                      ? "Nova is evaluating…"
                      : recording
                        ? "Speak now — your words will appear here…"
                        : "Type your answer or click the mic to speak…"
                  }
                  rows={2}
                  className="w-full resize-none rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-[var(--neon-cyan)]/60 disabled:opacity-50"
                />
              </div>
              <button
                onClick={submitAnswer}
                disabled={!answer.trim() || submitting}
                className="group flex h-14 items-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-5 text-sm font-medium text-primary-foreground shadow-[0_8px_30px_-8px_oklch(0.65_0.26_300/70%)] transition-opacity disabled:opacity-40"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — Transcript */}
        <aside className="order-3">
          <div className="glass-strong sticky top-28 flex h-[calc(100vh-9rem)] max-h-[720px] flex-col rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">Live Transcript</h3>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-muted-foreground">
                AI Interview · Q{questionNumber}/{TOTAL_QUESTIONS}
              </span>
            </div>
            <div
              ref={listRef}
              className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1"
            >
              {transcript.map((t, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${t.who === "AI"
                    ? t.type === "follow_up"
                      ? "border border-amber-500/30 bg-amber-500/10 text-foreground/90"
                      : t.type === "feedback"
                        ? "bg-emerald-500/10 text-foreground/90"
                        : "bg-white/[0.04] text-foreground/90"
                    : "ml-6 bg-[image:var(--gradient-primary)] text-primary-foreground"
                    }`}
                >
                  <div className="mb-0.5 text-[10px] uppercase tracking-wider opacity-70">
                    {t.who === "AI"
                      ? t.type === "follow_up"
                        ? "Nova · Follow-up"
                        : t.type === "feedback"
                          ? "Nova · Feedback"
                          : "Nova"
                      : "You"}
                  </div>
                  {t.text}
                </motion.div>
              ))}
              {submitting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground"
                >
                  <Loader2 className="h-3 w-3 animate-spin" /> Nova is evaluating your answer…
                </motion.div>
              )}
            </div>
            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full bg-[image:var(--gradient-primary)]"
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <button
                onClick={() => {
                  window.speechSynthesis.cancel();
                  recognitionRef.current?.abort();
                  sessionStorage.setItem("interviewTranscript", JSON.stringify(transcript));
                  navigate({ to: "/results" });
                }}
                className="mt-3 w-full rounded-full border border-white/10 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
              >
                End interview
              </button>
            </div>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
