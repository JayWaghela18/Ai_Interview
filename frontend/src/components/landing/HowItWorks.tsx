import { motion } from "motion/react";
import { Upload, ScanSearch, Mic, LineChart } from "lucide-react";
import { SectionHeader } from "./Features";

const steps = [
  {
    icon: Upload,
    title: "Upload Resume",
    desc: "Drop in your PDF or DOCX. Aether reads role, experience, and projects in seconds.",
  },
  {
    icon: ScanSearch,
    title: "AI Analysis",
    desc: "A tailored interview plan is built around your skills and target role — technical, HR, and system design.",
  },
  {
    icon: Mic,
    title: "Voice Interview",
    desc: "Talk to Aether like a real interviewer. Adaptive follow-ups, natural pacing, live transcript.",
  },
  {
    icon: LineChart,
    title: "Personalized Report",
    desc: "Get per-answer scoring, strengths, gaps, and a roadmap you can act on tomorrow.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative px-4 py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            "radial-gradient(45% 35% at 50% 50%, oklch(0.6 0.24 305 / 15%), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl">
        <SectionHeader
          eyebrow="How it works"
          title="Four steps to your dream offer"
          sub="A calm, guided flow — no setup, no friction."
        />

        <div className="relative mt-20">
          {/* Vertical timeline line with animated shimmer */}
          <div
            aria-hidden
            className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 md:block"
            style={{
              background:
                "linear-gradient(to bottom, transparent, oklch(0.7 0.22 270 / 55%), oklch(0.65 0.26 305 / 55%), transparent)",
            }}
          />
          <motion.div
            aria-hidden
            className="absolute left-1/2 top-0 hidden h-32 w-[3px] -translate-x-1/2 rounded-full md:block"
            style={{
              background:
                "linear-gradient(to bottom, transparent, oklch(0.9 0.15 220 / 90%), transparent)",
              filter: "blur(1px)",
            }}
            animate={{ y: ["-10%", "110%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          <ol className="space-y-14 md:space-y-24">
            {steps.map((s, i) => (
              <TimelineStep key={s.title} step={s} index={i} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
};

function TimelineStep({ step, index }: { step: Step; index: number }) {
  const { icon: Icon, title, desc } = step;
  const left = index % 2 === 0;

  return (
    <motion.li
      initial={{ opacity: 0, y: 40, x: left ? -20 : 20 }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative grid gap-6 md:grid-cols-2 md:items-center"
    >
      <div className={left ? "md:pr-16 md:text-right" : "md:order-2 md:pl-16"}>
        <div
          className={`glass-strong group relative overflow-hidden rounded-2xl p-6 transition-transform duration-500 hover:-translate-y-1 ${
            left ? "md:ml-auto" : ""
          } max-w-md`}
        >
          <div className="mb-3 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
            Step {String(index + 1).padStart(2, "0")}
          </div>
          <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {desc}
          </p>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
          />
        </div>
      </div>

      {/* Node */}
      <div
        className={`hidden md:flex ${
          left ? "md:order-2 md:justify-start md:pl-16" : "md:justify-end md:pr-16"
        }`}
      >
        <motion.div
          className="relative flex h-16 w-16 items-center justify-center"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }}
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-[image:var(--gradient-primary)] blur-xl"
            animate={{ opacity: [0.55, 0.9, 0.55], scale: [1, 1.08, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
          />
          <div className="glass-strong relative flex h-14 w-14 items-center justify-center rounded-full text-foreground">
            <motion.span
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
            >
              <Icon className="h-6 w-6 text-[var(--neon-cyan)]" />
            </motion.span>
          </div>
        </motion.div>
      </div>

      {/* Center dot on timeline */}
      <div
        aria-hidden
        className="absolute left-1/2 top-8 hidden h-3 w-3 -translate-x-1/2 rounded-full bg-[var(--neon-cyan)] animate-pulse-dot md:block"
      />
    </motion.li>
  );
}
