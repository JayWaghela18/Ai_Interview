import { motion } from "motion/react";
import { useEffect, useState } from "react";
import robot from "@/assets/robot-mascot.png";

interface RobotMascotProps {
  size?: number;
  speaking?: boolean;
  showRing?: boolean;
  showParticles?: boolean;
  className?: string;
}

/**
 * Reusable robot mascot with breathing float, idle head tilt, blinking overlay,
 * glowing ring backdrop and floating holographic particles.
 */
export function RobotMascot({
  size = 360,
  speaking = false,
  showRing = true,
  showParticles = true,
  className = "",
}: RobotMascotProps) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loop = () => {
      if (cancelled) return;
      const delay = 2800 + Math.random() * 3200;
      setTimeout(() => {
        if (cancelled) return;
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        loop();
      }, delay);
    };
    loop();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Glowing ring backdrop */}
      {showRing && (
        <>
          <motion.div
            aria-hidden
            className="absolute inset-[8%] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, oklch(0.7 0.22 260 / 55%), transparent 65%)",
            }}
            animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.05, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-[6%] rounded-full"
            style={{
              background: "var(--gradient-portal)",
              mask: "radial-gradient(circle, transparent 60%, black 62%, transparent 70%)",
              WebkitMask:
                "radial-gradient(circle, transparent 60%, black 62%, transparent 70%)",
              filter: "blur(2px)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-[4%] rounded-full border border-white/15"
            style={{
              mask: "radial-gradient(circle, transparent 62%, black 63%, transparent 66%)",
              WebkitMask:
                "radial-gradient(circle, transparent 62%, black 63%, transparent 66%)",
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          />
        </>
      )}

      {/* Robot — floating + breathing + idle head sway */}
      <motion.div
        className="absolute inset-0 flex items-end justify-center"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          className="relative"
          style={{ width: "88%", height: "88%" }}
          animate={
            speaking
              ? { rotate: [-1.5, 1.5, -1.5], scale: [1, 1.015, 1] }
              : { rotate: [-2, 2, -2] }
          }
          transition={{
            duration: speaking ? 0.9 : 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.img
            src={robot}
            alt="Nova — your AI interview mentor"
            width={1024}
            height={1024}
            className="h-full w-full object-contain"
            style={{
              filter:
                "drop-shadow(0 20px 40px oklch(0.55 0.24 275 / 55%)) drop-shadow(0 0 30px oklch(0.75 0.2 250 / 35%))",
            }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Blink overlay — dark bars over eyes */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-[22%] right-[22%] top-[30%] flex justify-between"
            animate={{ scaleY: blink ? 1 : 0 }}
            transition={{ duration: 0.09, ease: "easeOut" }}
            style={{ transformOrigin: "center" }}
          >
            <span
              className="block h-[6%] w-[24%] rounded-full"
              style={{ background: "oklch(0.14 0.03 275)" }}
            />
            <span
              className="block h-[6%] w-[24%] rounded-full"
              style={{ background: "oklch(0.14 0.03 275)" }}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Ground reflection */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[22%] bottom-[6%] h-4 rounded-[50%] bg-[radial-gradient(ellipse,oklch(0.7_0.22_270/50%),transparent_70%)] blur-md"
      />

      {/* Holographic particles */}
      {showParticles &&
        Array.from({ length: 14 }).map((_, i) => {
          const angle = (i / 14) * 360;
          const dur = 12 + (i % 5) * 2;
          const radius = 42 + (i % 4) * 3;
          return (
            <motion.div
              key={i}
              aria-hidden
              className="absolute left-1/2 top-1/2 h-1 w-1"
              style={{ transformOrigin: "0 0" }}
              animate={{ rotate: [angle, angle + 360] }}
              transition={{ duration: dur, repeat: Infinity, ease: "linear" }}
            >
              <span
                className="absolute block h-1 w-1 rounded-full bg-white"
                style={{
                  transform: `translate(${(size * radius) / 100}px, 0)`,
                  boxShadow: "0 0 8px 2px oklch(0.85 0.16 250 / 80%)",
                }}
              />
            </motion.div>
          );
        })}
    </div>
  );
}
