import { motion } from "motion/react";
import { RobotMascot } from "@/components/robot/RobotMascot";
import {
  FileText,
  MessageSquare,
  Mic,
  Brain,
  BarChart3,
  Sparkles,
} from "lucide-react";

const cards = [
  { icon: FileText, label: "Resume Analysis", pos: "top-[6%] left-0 sm:-left-6 md:-left-12" },
  { icon: MessageSquare, label: "AI Interview", pos: "top-[4%] right-0 sm:-right-4 md:-right-10" },
  { icon: Mic, label: "Voice AI", pos: "top-1/2 -left-2 sm:-left-8 md:-left-16 -translate-y-1/2" },
  { icon: Brain, label: "LLM Intelligence", pos: "top-1/2 -right-2 sm:-right-8 md:-right-14 -translate-y-1/2" },
  { icon: BarChart3, label: "Analytics", pos: "bottom-[8%] left-2 sm:-left-4 md:-left-8", hideOnMobile: true },
  { icon: Sparkles, label: "Personalized Feedback", pos: "bottom-[6%] right-2 sm:-right-4 md:-right-8", hideOnMobile: true },
];

export function AetherPortal() {
  return (
    <motion.div
      className="relative mx-auto aspect-square w-full max-w-[560px]"
      animate={{ scale: [1, 1.01, 1] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Portal glow layers */}
      <div
        aria-hidden
        className="absolute inset-6 rounded-full opacity-70 blur-3xl"
        style={{ background: "var(--gradient-portal)" }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: "var(--gradient-portal)",
          filter: "blur(2px)",
          mask: "radial-gradient(circle, transparent 58%, black 60%, transparent 68%)",
          WebkitMask:
            "radial-gradient(circle, transparent 58%, black 60%, transparent 68%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-2 rounded-full border border-dashed border-[var(--neon-cyan)]/25"
        style={{
          mask: "radial-gradient(circle, transparent 66%, black 67%, transparent 70%)",
          WebkitMask:
            "radial-gradient(circle, transparent 66%, black 67%, transparent 70%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />

      {/* Light rays */}
      <div aria-hidden className="absolute inset-0 overflow-hidden rounded-full">
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <motion.span
            key={deg}
            className="absolute left-1/2 top-1/2 h-[140%] w-[2px] -translate-x-1/2 -translate-y-1/2 origin-center"
            style={{
              transform: `translate(-50%, -50%) rotate(${deg}deg)`,
              background:
                "linear-gradient(to bottom, transparent, oklch(0.85 0.16 250 / 35%), transparent)",
              filter: "blur(1.5px)",
            }}
            animate={{ opacity: [0.15, 0.55, 0.15] }}
            transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
          />
        ))}
      </div>

      {/* Energy waves - expanding rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute inset-10 rounded-full border border-[var(--neon-cyan)]/30"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: [0.85, 1.15], opacity: [0, 0.5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeOut", delay: i * 1.6 }}
        />
      ))}

      {/* Robot mascot */}
      <div className="absolute inset-0">
        <RobotMascot size={560} showRing={false} showParticles={false} className="mx-auto" />
      </div>

      {/* Floating cards */}
      {cards.map((c, i) => (
        <FloatingCard key={c.label} {...c} delay={i * 0.15} />
      ))}
    </motion.div>
  );
}

function FloatingCard({
  icon: Icon,
  label,
  pos,
  delay,
  hideOnMobile,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  pos: string;
  delay: number;
  hideOnMobile?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 + delay, duration: 0.7, ease: "easeOut" }}
      className={`absolute ${pos} z-10 ${hideOnMobile ? "hidden sm:block" : ""}`}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4 + delay * 2, repeat: Infinity, ease: "easeInOut", delay }}
      >
        <motion.div
          whileHover={{ y: -4, rotate: 2, scale: 1.04 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="glass-strong group relative flex cursor-default items-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-[11px] font-medium tracking-tight text-foreground/90 shadow-[0_8px_30px_-10px_oklch(0.55_0.24_275/60%)] transition-shadow duration-500 hover:shadow-[0_18px_50px_-10px_oklch(0.65_0.26_300/70%)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[image:var(--gradient-primary)] text-primary-foreground transition-transform duration-500 group-hover:rotate-[-6deg]">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="whitespace-nowrap">{label}</span>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
