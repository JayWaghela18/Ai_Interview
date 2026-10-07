import { useState, useCallback, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, User, ArrowRight, Sparkles } from "lucide-react";
import { Background } from "@/components/landing/Background";
import { AuthRobot } from "@/components/auth/AuthRobot";
import { FloatingLabelInput } from "@/components/auth/FloatingLabelInput";
import { GoogleButton } from "@/components/auth/SocialButton";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({
    component: SignUpPage,
});

function SignUpPage() {
    const [values, setValues] = useState({
        name: "",
        email: "",
        password: "",
        confirm: "",
    });
    const [errors, setErrors] = useState<Partial<typeof values>>({});
    const [loading, setLoading] = useState(false);
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
    const btnRef = useRef<HTMLButtonElement>(null);

    const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setValues((v) => ({ ...v, [key]: e.target.value }));
        if (errors[key]) setErrors((er) => ({ ...er, [key]: "" }));
    };

    const validate = useCallback(() => {
        const newErrors: Partial<typeof values> = {};
        if (!values.name.trim()) newErrors.name = "Full name is required";
        if (!values.email) newErrors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
            newErrors.email = "Enter a valid email";
        if (!values.password) newErrors.password = "Password is required";
        else if (values.password.length < 8)
            newErrors.password = "Password must be at least 8 characters";
        if (values.confirm !== values.password) newErrors.confirm = "Passwords do not match";
        return newErrors;
    }, [values]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors = validate();
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        setLoading(true);
        setTimeout(() => setLoading(false), 2000);
    };

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

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Floating card */}
                <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
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
                        {/* Top glow accent */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -top-px left-1/2 h-px w-3/5 -translate-x-1/2"
                            style={{
                                background:
                                    "linear-gradient(90deg, transparent, oklch(0.65 0.26 300 / 80%), transparent)",
                            }}
                        />
                        <div className="pointer-events-none absolute inset-0 noise-overlay opacity-[0.03]" />

                        {/* Robot */}
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
                                    background: "oklch(0.65 0.26 300 / 10%)",
                                    border: "1px solid oklch(0.65 0.26 300 / 20%)",
                                }}
                            >
                                <Sparkles className="h-3 w-3" style={{ color: "oklch(0.65 0.26 300)" }} />
                                Join 12,000+ candidates
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground"
                            >
                                Create Account
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                className="mt-2 text-sm text-muted-foreground"
                            >
                                Begin your AI Interview Journey
                            </motion.p>
                        </div>

                        {/* Form */}
                        <motion.form
                            onSubmit={handleSubmit}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.35, duration: 0.5 }}
                            className="space-y-4"
                            noValidate
                        >
                            <FloatingLabelInput
                                label="Full name"
                                icon={User}
                                type="text"
                                id="signup-name"
                                value={values.name}
                                onChange={set("name")}
                                error={errors.name}
                                autoComplete="name"
                            />

                            <FloatingLabelInput
                                label="Email address"
                                icon={Mail}
                                type="email"
                                id="signup-email"
                                value={values.email}
                                onChange={set("email")}
                                onBlur={() => {
                                    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
                                        setErrors((er) => ({ ...er, email: "Enter a valid email" }));
                                    }
                                }}
                                error={errors.email}
                                autoComplete="email"
                            />

                            <FloatingLabelInput
                                label="Password"
                                icon={Lock}
                                type="password"
                                id="signup-password"
                                value={values.password}
                                onChange={set("password")}
                                error={errors.password}
                                success={values.password.length >= 8 && !errors.password}
                                autoComplete="new-password"
                            />

                            <FloatingLabelInput
                                label="Confirm password"
                                icon={Lock}
                                type="password"
                                id="signup-confirm"
                                value={values.confirm}
                                onChange={set("confirm")}
                                error={errors.confirm}
                                success={
                                    Boolean(values.confirm) &&
                                    values.confirm === values.password &&
                                    !errors.confirm
                                }
                                autoComplete="new-password"
                            />

                            {/* Submit button */}
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
                                        "0 0 60px -6px oklch(0.65 0.26 300 / 90%), 0 6px 24px -4px oklch(0.65 0.24 275 / 70%)";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                                        "0 0 40px -8px oklch(0.65 0.26 300 / 70%), 0 4px 16px -4px oklch(0.65 0.24 275 / 50%)";
                                }}
                                aria-label="Create Account"
                            >
                                <AnimatePresence>
                                    {ripples.map((rp) => (
                                        <motion.span
                                            key={rp.id}
                                            initial={{ opacity: 0.5, scale: 0, width: 20, height: 20 }}
                                            animate={{ opacity: 0, scale: 14 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.65, ease: "easeOut" }}
                                            className="pointer-events-none absolute rounded-full bg-white/30"
                                            style={{ left: rp.x - 10, top: rp.y - 10 }}
                                        />
                                    ))}
                                </AnimatePresence>

                                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 hover:translate-x-full" />

                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Creating account…
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Create Account
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

                        {/* Google */}
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.4 }}
                        >
                            <GoogleButton />
                        </motion.div>

                        {/* Login link */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.55, duration: 0.4 }}
                            className="mt-6 text-center text-sm text-muted-foreground"
                        >
                            Already have an account?{" "}
                            <Link
                                to="/login"
                                className="font-semibold transition-colors"
                                style={{ color: "oklch(0.78 0.18 265)", textDecoration: "none" }}
                            >
                                Sign In
                            </Link>
                        </motion.p>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
