import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { MagneticButton } from "./Hero";

export function CTA() {
  return (
    <section id="cta" className="relative px-4 py-32">
      {/* Cinematic radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 50%, oklch(0.6 0.26 300 / 25%), transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-8 py-20 text-center"
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-70"
          style={{ background: "var(--gradient-aurora)" }}
        />
        <div aria-hidden className="absolute inset-0 -z-10 grid-overlay opacity-40" />

        {/* Rotating aura */}
        <motion.div
          aria-hidden
          className="absolute inset-[-30%] -z-10 opacity-40 blur-3xl"
          style={{ background: "var(--gradient-portal)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />

        {/* Sweeping light */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -top-20 left-0 h-[200%] w-40 -rotate-12 blur-2xl"
          style={{
            background:
              "linear-gradient(to bottom, transparent, oklch(1 0 0 / 12%), transparent)",
          }}
          animate={{ x: ["-20%", "120%"] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />

        <h2 className="mx-auto max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Your next interview <span className="text-gradient">starts now.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Join thousands of candidates practicing with Aether every day.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <MagneticButton primary href="/upload">
            <span className="flex items-center gap-2">
              Start Free Journey
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </MagneticButton>
          <MagneticButton href="#features">Explore Features</MagneticButton>
        </div>
      </motion.div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
        <div>© {new Date().getFullYear()} InterviewAI. Guided by Aether.</div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="hover:text-foreground transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
