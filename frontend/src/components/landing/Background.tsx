import { motion } from "motion/react";

/**
 * Full-screen animated backdrop composed of five depth layers:
 *   1. Aurora gradient mesh
 *   2. Blurred colored blobs
 *   3. Slow-drifting light beams
 *   4. Floating particles + grid overlay
 *   5. Subtle noise texture + vignette
 */
export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* 1. Base aurora */}
      <div className="absolute inset-0 aurora-bg" />

      {/* 2. Slow-moving color blobs */}
      <motion.div
        aria-hidden
        className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.26 275 / 55%), transparent 70%)" }}
        animate={{ x: [0, 60, -20, 0], y: [0, 40, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute top-1/3 -right-40 h-[560px] w-[560px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.6 0.26 310 / 45%), transparent 70%)" }}
        animate={{ x: [0, -40, 20, 0], y: [0, -30, 40, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-[-200px] left-1/3 h-[600px] w-[600px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.6 0.22 220 / 35%), transparent 70%)" }}
        animate={{ x: [0, 30, -40, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 3. Drifting light beams */}
      <LightBeams />

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-overlay opacity-40" />

      {/* 4. Particles */}
      <Particles />

      {/* 5. Noise + vignette */}
      <div className="absolute inset-0 noise-overlay opacity-[0.04]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--background)_100%)]" />
    </div>
  );
}

function LightBeams() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        aria-hidden
        className="absolute -top-1/4 left-1/4 h-[140%] w-[280px] origin-top rotate-[18deg] blur-3xl"
        style={{
          background:
            "linear-gradient(to bottom, transparent, oklch(0.75 0.2 265 / 22%), transparent)",
        }}
        animate={{ x: [-120, 120, -120], opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -top-1/4 right-1/4 h-[140%] w-[220px] origin-top -rotate-[14deg] blur-3xl"
        style={{
          background:
            "linear-gradient(to bottom, transparent, oklch(0.7 0.24 305 / 20%), transparent)",
        }}
        animate={{ x: [80, -100, 80], opacity: [0.3, 0.65, 0.3] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function Particles() {
  const dots = Array.from({ length: 44 });
  return (
    <div className="absolute inset-0">
      {dots.map((_, i) => {
        const size = 1 + (i % 4);
        const left = (i * 97) % 100;
        const top = (i * 53) % 100;
        const delay = (i % 10) * 0.6;
        const dur = 8 + (i % 7);
        return (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white/70"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              top: `${top}%`,
              filter: "blur(0.5px)",
              boxShadow: "0 0 6px 1px oklch(0.85 0.16 250 / 60%)",
            }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}
          />
        );
      })}
    </div>
  );
}
