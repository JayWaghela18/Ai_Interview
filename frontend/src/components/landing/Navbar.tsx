import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

const links = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how" },
  { label: "Interview", href: "/interview" },
  { label: "Results", href: "/results" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 flex justify-center px-4 transition-all duration-500 ${scrolled ? "pt-2" : "pt-4"
        }`}
    >
      <nav
        className={`glass relative flex items-center justify-between rounded-full transition-all duration-500 ${scrolled
            ? "w-full max-w-5xl px-3 py-2 shadow-[0_10px_40px_-10px_oklch(0.55_0.24_275/50%)]"
            : "w-full max-w-6xl px-4 py-2.5"
          }`}
        style={
          scrolled
            ? {
              boxShadow:
                "0 10px 40px -10px oklch(0.55 0.24 275 / 50%), inset 0 1px 0 oklch(1 0 0 / 8%)",
            }
            : { boxShadow: "inset 0 1px 0 oklch(1 0 0 / 6%)" }
        }
      >
        {/* border glow */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-full transition-opacity duration-500 ${scrolled ? "opacity-100" : "opacity-0"
            }`}
          style={{
            boxShadow:
              "0 0 0 1px oklch(0.7 0.22 275 / 25%), 0 0 30px oklch(0.65 0.26 300 / 25%)",
          }}
        />
        <Link to="/" className="relative flex items-center gap-2 pl-2">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            <span className="absolute inset-0 -z-10 rounded-lg bg-[image:var(--gradient-primary)] opacity-70 blur-md" />
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight">
            Interview<span className="text-gradient">AI</span>
          </span>
        </Link>

        <ul className="relative hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="relative rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="relative flex items-center gap-2">
          <Link
            to="/login"
            className="hidden rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
          >
            Login
          </Link>
          <Link
            to="/upload"
            className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-[image:var(--gradient-primary)] px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_8px_30px_-8px_oklch(0.65_0.26_300/70%)] transition-transform hover:scale-[1.03]"
          >
            <span className="relative z-10">Get Started</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
