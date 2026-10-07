import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, UploadCloud, CheckCircle2, ArrowRight, X } from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
  head: () => ({
    meta: [
      { title: "Upload Resume — InterviewAI" },
      { name: "description", content: "Upload your resume to start a personalized AI interview." },
    ],
  }),
});

type Stage = "idle" | "uploading" | "analyzing" | "done";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const validate = (f: File) => {
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      return "Only PDF files are supported.";
    }
    if (f.size > 10 * 1024 * 1024) return "File must be under 10MB.";
    return null;
  };

  const beginUpload = useCallback(async (f: File) => {
    console.log("Upload started for file:", f.name);
    const err = validate(f);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setFile(f);
    setStage("uploading");
    setProgress(20);

    const formData = new FormData();
    formData.append("file", f);

    try {
      // ── Step 1: Upload PDF → extract text ──
      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const detail = await uploadRes.json().catch(() => null);
        throw new Error(detail?.detail || "Upload failed");
      }

      const uploadData = await uploadRes.json();
      console.log(`✅ Extracted text from ${uploadData.pages} page(s):`, uploadData.text.substring(0, 200));
      setProgress(50);

      // ── Step 2: Send text to AI for parsing ──
      setStage("analyzing");
      const analyzeRes = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: uploadData.text }),
      });

      if (!analyzeRes.ok) {
        const detail = await analyzeRes.json().catch(() => null);
        throw new Error(detail?.detail || "Analysis failed");
      }

      const parsedResume = await analyzeRes.json();
      console.log("✅ AI parsed resume:", parsedResume);

      // ── Step 3: Save to sessionStorage and mark done ──
      sessionStorage.setItem("parsedResume", JSON.stringify(parsedResume));

      setProgress(100);
      setStage("done");
    } catch (uploadErr: unknown) {
      const message = uploadErr instanceof Error ? uploadErr.message : "Something went wrong";
      const isNetworkError =
        uploadErr instanceof TypeError ||
        (uploadErr instanceof Error && /failed to fetch|network error/i.test(uploadErr.message));
      setError(
        import.meta.env.PROD
          ? `${message}. Please check your Vercel logs and API configuration.`
          : isNetworkError
            ? `${message}. Is the backend running on port 8000?`
            : message,
      );
      setStage("idle");
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) beginUpload(f);
  };

  const reset = () => {
    setFile(null);
    setStage("idle");
    setProgress(0);
    setError(null);
  };

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-3xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="glass mx-auto mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-cyan)]" />
            Step 1 of 3 — Upload
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Upload your <span className="text-gradient">resume</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Drop your PDF and Nova will craft an interview tailored to your experience.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="glass-strong relative mt-10 overflow-hidden rounded-3xl p-6 sm:p-8"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-40"
            style={{ background: "var(--gradient-aurora)" }}
          />

          <AnimatePresence mode="wait">
            {stage === "idle" && (
              <motion.div
                key="drop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                  dragOver
                    ? "border-[var(--neon-cyan)] bg-white/[0.04]"
                    : "border-white/15 hover:border-white/30"
                }`}
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] shadow-[0_10px_40px_-10px_oklch(0.65_0.26_300/70%)]"
                >
                  <UploadCloud className="h-7 w-7 text-primary-foreground" />
                </motion.div>
                <h3 className="mt-5 font-display text-xl font-semibold">
                  Drag & drop your PDF here
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  or click to browse — Max 10MB
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) beginUpload(f);
                  }}
                />
                {error && (
                  <p className="mt-4 text-xs text-destructive">{error}</p>
                )}
              </motion.div>
            )}

            {stage !== "idle" && file && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)]">
                    <FileText className="h-6 w-6 text-primary-foreground" />
                    {stage === "done" && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--neon-cyan)] text-background"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </motion.span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <button
                        onClick={reset}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB · PDF
                    </p>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {stage === "uploading"
                        ? `Uploading… ${Math.round(progress)}%`
                        : stage === "analyzing"
                        ? `Analyzing with AI… ${Math.round(progress)}%`
                        : "✅ Analysis complete — ready for interview!"}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Back
            </Link>
            <div className="flex gap-3">
              {stage === "idle" && (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="glass rounded-full px-5 py-2.5 text-sm font-medium hover:bg-white/[0.06]"
                >
                  Upload Resume
                </button>
              )}
              <motion.button
                disabled={stage !== "done"}
                onClick={() => navigate({ to: "/interview" })}
                whileTap={{ scale: 0.97 }}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[image:var(--gradient-primary)] px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_8px_30px_-8px_oklch(0.65_0.26_300/70%)] transition-opacity disabled:opacity-40"
              >
                Continue
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>
    </PageShell>
  );
}
