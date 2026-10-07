import { useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { Background } from "@/components/landing/Background";
import { AuthRobot } from "@/components/auth/AuthRobot";
import { FloatingLabelInput } from "@/components/auth/FloatingLabelInput";
import { GoogleButton } from "@/components/auth/SocialButton";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
    component: LoginPage,
});

function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState("");
    const [loading, setLoading] = useState(false);
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
    const btnRef = useRef<HTMLButtonElement>(null);
    const navigate = useNavigate();
    const containerVariants = {
        hidden: { opacity: 0, y: 24 },
        show: { opacity: 1, y: 0, transition: { staggerChildren: 0.06, when: "beforeChildren" } },
    } as const;

    const validateEmail = (val: string) => {
        if (!val) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Enter a valid email";
        return "";
    };

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            const err = validateEmail(email);
            setEmailError(err);
            if (err) return;
            setLoading(true);
            // simulate auth request then navigate to the next onboarding step
            setTimeout(() => {
                setLoading(false);
                navigate({ to: "/upload" });
            }, 900);
        },
        [email, navigate]
    );

    const addRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
        const btn = btnRef.current;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        setRipples((r) => [...r, { id, x, y }]);
        setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 700);
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
            <Background />

            {/* Page entrance */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Floating card animation */}
                <motion.div
                    whileHover={{ y: -4, scale: 1.006 }}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                    {/* Glassmorphism card */}
                    <div
                        className="relative overflow-hidden rounded-[24px] p-8"
                        style={{
                            background:
                                "linear-gradient(135deg, oklch(0.22 0.05 275 / 80%), oklch(0.16 0.04 275 / 70%))",
                            backdropFilter: "blur(24px) saturate(160%)",
                            border: "1.5px solid oklch(0.98 0.01 260 / 12%)",
                            boxShadow:
                                "0 20px 80px -20px oklch(0.65 0.26 275 / 35%), 0 0 0 1px oklch(0.72 0.19 265 / 10%), inset 0 1px 0 oklch(1 0 0 / 6%)",
                        }}
                    >
                        {/* small decorative orbs */}
                        <motion.span
                            aria-hidden
                            className="absolute -top-10 -left-8 h-6 w-6 rounded-full blur-2xl"
                            style={{ background: "radial-gradient(circle, oklch(0.72 0.19 265 / 80%), transparent 60%)" }}
                            animate={{ x: [0, 12, -6, 0], y: [0, -8, 4, 0], opacity: [0.6, 1, 0.6, 0.6] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.span
                            aria-hidden
                            className="absolute -bottom-6 -right-6 h-8 w-8 rounded-full blur-2xl"
                            style={{ background: "radial-gradient(circle, oklch(0.65 0.26 300 / 70%), transparent 60%)" }}
                            animate={{ x: [0, -18, 8, 0], y: [0, 10, -6, 0], opacity: [0.5, 0.95, 0.5, 0.5] }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        />
                        {/* Top glow accent */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -top-px left-1/2 h-px w-3/5 -translate-x-1/2"
                            style={{
                                background:
                                    "linear-gradient(90deg, transparent, oklch(0.72 0.19 265 / 80%), transparent)",
                            }}
                        />
                        {/* Noise texture */}
                        <div className="pointer-events-none absolute inset-0 noise-overlay opacity-[0.03]" />

                        {/* Robot mascot */}
                        <div className="mb-6">
                            <AuthRobot />
                        </div>

                        {/* Heading */}
                        <div className="mb-8 text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15, duration: 0.5 }}
                                className="mb-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground"
                                style={{
                                    background: "oklch(0.72 0.19 265 / 10%)",
                                    border: "1px solid oklch(0.72 0.19 265 / 20%)",
                                }}
                            >
                                <Sparkles className="h-3 w-3" style={{ color: "oklch(0.85 0.16 210)" }} />
                                AI Interview Simulator
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground"
                            >
                                Welcome Back
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                className="mt-2 text-sm text-muted-foreground"
                            >
                                Continue your AI Interview Journey
                            </motion.p>
                        </div>

                        {/* Form */}
                        <motion.form
                            onSubmit={handleSubmit}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35, duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                            className="space-y-4"
                            noValidate
                        >
                            <FloatingLabelInput
                                label="Email address"
                                icon={Mail}
                                type="email"
                                id="login-email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (emailError) setEmailError("");
                                }}
                                onBlur={() => setEmailError(validateEmail(email))}
                                error={emailError}
                                autoComplete="email"
                            />

                            <FloatingLabelInput
                                label="Password"
                                icon={Lock}
                                type="password"
                                id="login-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />

                            {/* Forgot password */}
                            <div className="flex justify-end">
                                <Link
                                    to="/login"
                                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                                    style={{ textDecoration: "none" }}
                                >
                                    Forgot Password?
                                </Link>
                            </div>

                            {/* Login button */}
                            <motion.button
                                ref={btnRef}
                                type="submit"
                                disabled={loading}
                                whileHover={{ scale: 1.015 }}
                                whileTap={{ scale: 0.975 }}
                                onClick={addRipple}
                                className="relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-300 disabled:opacity-70"
                                style={{
                                    background:
                                        "linear-gradient(135deg, oklch(0.65 0.24 275), oklch(0.65 0.26 310))",
                                    boxShadow:
                                        "0 0 40px -8px oklch(0.65 0.26 300 / 70%), 0 4px 16px -4px oklch(0.65 0.24 275 / 50%)",
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                                        "0 0 72px -6px oklch(0.65 0.26 300 / 95%), 0 8px 28px -6px oklch(0.65 0.24 275 / 80%)";
                                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                                        "0 0 40px -8px oklch(0.65 0.26 300 / 70%), 0 4px 16px -4px oklch(0.65 0.24 275 / 50%)";
                                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                                }}
                                aria-label="Login"
                            >
                                {/* Ripples */}
                                <AnimatePresence>
                                    {ripples.map((rp) => (
                                        <motion.span
                                            key={rp.id}
                                            initial={{ opacity: 0.5, scale: 0, width: 20, height: 20 }}
                                            animate={{ opacity: 0, scale: 14 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.65, ease: "easeOut" }}
                                            className="pointer-events-none absolute rounded-full bg-white/30"
                                            style={{
                                                left: rp.x - 10,
                                                top: rp.y - 10,
                                            }}
                                        />
                                    ))}
                                </AnimatePresence>

                                {/* Shine sweep */}
                                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 hover:translate-x-full" />

                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Signing in…
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Sign In
                                        <ArrowRight className="h-4 w-4" />
                                    </span>
                                )}
                            </motion.button>
                        </motion.form>

                        {/* Divider */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.45, duration: 0.4 }}
                            className="my-6 flex items-center gap-3"
                        >
                            <div
                                className="h-px flex-1"
                                style={{
                                    background:
                                        "linear-gradient(to right, transparent, oklch(0.98 0.01 260 / 15%), transparent)",
                                }}
                            />
                            <span className="text-xs text-muted-foreground">OR</span>
                            <div
                                className="h-px flex-1"
                                style={{
                                    background:
                                        "linear-gradient(to left, transparent, oklch(0.98 0.01 260 / 15%), transparent)",
                                }}
                            />
                        </motion.div>

                        {/* Google button */}
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.4 }}
                        >
                            <GoogleButton />
                        </motion.div>

                        {/* Sign up link */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.55, duration: 0.4 }}
                            className="mt-6 text-center text-sm text-muted-foreground"
                        >
                            Don&apos;t have an account? {" "}
                                <Link
                                    to="/signup"
                                    className="font-semibold transition-colors"
                                    style={{ color: "oklch(0.78 0.18 265)", textDecoration: "none" }}
                                >
                                    Sign Up
                                </Link>
                        </motion.p>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
