import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageShell } from "@/components/shared/PageShell";
import { RobotMascot } from "@/components/robot/RobotMascot";

export const Route = createFileRoute("/analyzing")({
  component: AnalyzingPage,
  head: () => ({
    meta: [
      { title: "Analyzing resume — InterviewAI" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const steps = [
  "Analyzing resume…",
  "Extracting skills…",
  "Reading projects…",
  "Preparing interview…",
  "Generating personalized questions…",
];

function AnalyzingPage() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const perStep = 1600;
    const id = setInterval(() => {
      setI((p) => {
        if (p + 1 >= steps.length) {
          clearInterval(id);
          setTimeout(() => navigate({ to: "/interview" }), 900);
          return p;
        }
        return p + 1;
      });
    }, perStep);
    return () => clearInterval(id);
  }, [navigate]);

  useEffect(() => {
    const start = Date.now();
    const total = steps.length * 1600 + 900;
    let raf = 0;
    const tick = () => {
      const p = Math.min(100, ((Date.now() - start) / total) * 100);
      setProgress(p);
      if (p < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const R = 62;
  const C = 2 * Math.PI * R;

  return (
    <PageShell>
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 text-center">
        <div className="relative">
          <RobotMascot size={340} speaking />
          {/* Progress ring */}
          <svg
            className="pointer-events-none absolute inset-0 mx-auto"
            width={340}
            height={340}
            viewBox="0 0 140 140"
          >
            <defs>
              <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.72 0.19 250)" />
                <stop offset="100%" stopColor="oklch(0.65 0.26 305)" />
              </linearGradient>
            </defs>
            <circle
              cx={70}
              cy={70}
              r={R}
              fill="none"
              stroke="oklch(1 0 0 / 8%)"
              strokeWidth={2}
            />
            <motion.circle
              cx={70}
              cy={70}
              r={R}
              fill="none"
              stroke="url(#ringG)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={C}
              style={{ strokeDashoffset: C - (C * progress) / 100 }}
              transform="rotate(-90 70 70)"
            />
          </svg>
        </div>

        <div className="mt-6 h-16">
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="font-display text-2xl font-medium tracking-tight sm:text-3xl"
            >
              <span className="text-gradient">{steps[i]}</span>
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          {Math.round(progress)}% · Nova is preparing your session
        </div>

        {/* Step chips */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {steps.map((s, idx) => (
            <span
              key={s}
              className={`glass rounded-full px-3 py-1 text-[11px] transition-all ${
                idx <= i
                  ? "text-foreground shadow-[0_0_20px_-4px_oklch(0.65_0.26_300/60%)]"
                  : "text-muted-foreground/60"
              }`}
            >
              {s.replace("…", "")}
            </span>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
