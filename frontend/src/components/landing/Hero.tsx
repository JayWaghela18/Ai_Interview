import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { AetherPortal } from "./AetherPortal";

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center px-4 pt-28 pb-16">
      {/* Radial section glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            "radial-gradient(60% 55% at 65% 45%, oklch(0.6 0.24 285 / 22%), transparent 70%)",
        }}
      />
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 text-center lg:text-left"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground lg:mx-0"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--neon-cyan)] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--neon-cyan)]" />
            </span>
            Meet Aether — your AI interview mentor
          </motion.div>

          <h1 className="font-display text-5xl font-semibold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
            Master Every <br className="hidden sm:inline" />
            <span className="text-gradient">Interview</span> with AI
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
            Upload your resume. Practice with a voice-driven AI interviewer.
            Receive personalized feedback — and land your dream job.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <MagneticButton primary href="/upload">
              <span className="flex items-center gap-2">
                Start Journey
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </MagneticButton>
            <MagneticButton href="#how">
              <span className="flex items-center gap-2">
                <Play className="h-3.5 w-3.5 fill-current" />
                Watch Demo
              </span>
            </MagneticButton>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground lg:justify-start">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[var(--neon-cyan)]" />
              GPT-class voice AI
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div>Loved by 12,000+ candidates</div>
            <div className="h-3 w-px bg-white/10" />
            <div>SOC 2 in progress</div>
          </div>
        </motion.div>

        {/* Portal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <AetherPortal />
        </motion.div>
      </div>
    </section>
  );
}

export function MagneticButton({
  children,
  primary,
  href = "#",
}: {
  children: React.ReactNode;
  primary?: boolean;
  href?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(my, { stiffness: 220, damping: 18, mass: 0.4 });
  const gx = useTransform(sx, (v) => `${50 + v * 1.2}%`);
  const gy = useTransform(sy, (v) => `${50 + v * 1.2}%`);

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width - 0.5) * 24;
    const py = ((e.clientY - r.top) / r.height - 0.5) * 20;
    mx.set(px);
    my.set(py);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      whileTap={{ scale: 0.96 }}
      className={
        primary
          ? "group relative inline-flex items-center overflow-hidden rounded-full bg-[image:var(--gradient-primary)] px-6 py-3 text-sm font-medium text-primary-foreground animate-breathe-glow"
          : "glass group relative inline-flex items-center overflow-hidden rounded-full px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.06]"
      }
    >
      {/* radial hover light */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(120px circle at ${gx.get()} ${gy.get()}, oklch(1 0 0 / 22%), transparent 60%)`,
        }}
      />
      <span className="relative z-10">{children}</span>
      {/* shine sweep */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      {/* animated border for secondary */}
      {!primary && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            boxShadow:
              "inset 0 0 0 1px oklch(0.75 0.2 265 / 55%), 0 0 24px oklch(0.7 0.22 275 / 35%)",
          }}
        />
      )}
    </motion.a>
  );
}
