import { motion } from "motion/react";

/**
 * AI Robot mascot for the auth pages.
 * - Continuously floats up/down
 * - Eyes blink every ~4 seconds
 * - Soft neon glow halo behind it
 */
export function AuthRobot() {
  return (
    <div className="relative flex justify-center">
      {/* Glow halo behind robot */}
      <motion.div
        aria-hidden
        className="absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.65 0.26 275 / 70%), oklch(0.65 0.24 310 / 40%), transparent 70%)",
        }}
        animate={{ scale: [0.96, 1.06, 0.98], opacity: [0.8, 1, 0.9] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating robot with gentle rotate */}
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, 1.5, 0, -1.5, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
      >
        <RobotSVG />
      </motion.div>
    </div>
  );
}

function RobotSVG() {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AI Robot Mascot"
    >
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.32 0.08 275)" />
          <stop offset="100%" stopColor="oklch(0.2 0.06 275)" />
        </linearGradient>
        <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.36 0.1 270)" />
          <stop offset="100%" stopColor="oklch(0.24 0.07 275)" />
        </linearGradient>
        <filter id="eyeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="faceGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.72 0.19 250)" />
          <stop offset="100%" stopColor="oklch(0.65 0.26 300)" />
        </linearGradient>
      </defs>

      {/* Antenna */}
      <rect x="45" y="6" width="6" height="12" rx="3" fill="url(#accentGrad)" />
      <circle cx="48" cy="4" r="4" fill="oklch(0.85 0.16 210)" filter="url(#eyeGlow)" />

      {/* Head */}
      <rect x="18" y="16" width="60" height="42" rx="12" fill="url(#headGrad)" />
      {/* Head border glow */}
      <rect
        x="18" y="16" width="60" height="42" rx="12"
        fill="none"
        stroke="oklch(0.72 0.19 250 / 40%)"
        strokeWidth="1.5"
      />

      {/* Face panel */}
      <rect x="24" y="22" width="48" height="30" rx="8" fill="oklch(0.12 0.04 275)" />

      {/* Eyes */}
      <RobotEye cx={38} cy={36} />
      <RobotEye cx={58} cy={36} />

      {/* Mouth — friendly arc */}
      <path
        d="M 36 46 Q 48 54 60 46"
        stroke="url(#accentGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        filter="url(#faceGlow)"
      />

      {/* Neck */}
      <rect x="40" y="58" width="16" height="6" rx="3" fill="url(#bodyGrad)" />

      {/* Body */}
      <rect x="24" y="64" width="48" height="26" rx="10" fill="url(#bodyGrad)" />
      <rect
        x="24" y="64" width="48" height="26" rx="10"
        fill="none"
        stroke="oklch(0.72 0.19 250 / 30%)"
        strokeWidth="1"
      />

      {/* Chest panel */}
      <rect x="30" y="70" width="36" height="14" rx="5" fill="oklch(0.12 0.04 275)" />
      {/* Chest dots */}
      <circle cx="40" cy="77" r="3" fill="url(#accentGrad)" filter="url(#eyeGlow)" />
      <circle cx="48" cy="77" r="3" fill="oklch(0.85 0.16 210)" filter="url(#eyeGlow)" />
      <circle cx="56" cy="77" r="3" fill="oklch(0.65 0.26 300)" filter="url(#eyeGlow)" />

      {/* Arms */}
      <rect x="8" y="64" width="12" height="20" rx="6" fill="url(#bodyGrad)" />
      <rect x="76" y="64" width="12" height="20" rx="6" fill="url(#bodyGrad)" />
    </svg>
  );
}

/** Single blinking robot eye */
function RobotEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <motion.g
      animate={{
        scaleY: [1, 1, 1, 0.08, 1, 1, 1, 1, 1, 1, 0.08, 1],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.35, 0.38, 0.4, 0.42, 0.6, 0.65, 0.75, 0.78, 0.8, 0.82, 0.84],
      }}
      style={{ originX: `${cx}px`, originY: `${cy}px`, transformOrigin: `${cx}px ${cy}px` }}
    >
      <circle cx={cx} cy={cy} r={5} fill="oklch(0.85 0.16 210)" filter="url(#eyeGlow)" />
      <circle cx={cx} cy={cy} r={2.5} fill="oklch(0.14 0.03 275)" />
      <circle cx={cx - 1.5} cy={cy - 1.5} r={1} fill="white" opacity={0.7} />
    </motion.g>
  );
}
