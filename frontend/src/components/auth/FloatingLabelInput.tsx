import { useState, type InputHTMLAttributes, forwardRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingLabelInputProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    label: string;
    icon: LucideIcon;
    type?: "text" | "email" | "password";
    error?: string;
    success?: boolean;
}

export const FloatingLabelInput = forwardRef<
    HTMLInputElement,
    FloatingLabelInputProps
>(({ label, icon: Icon, type = "text", error, success, className, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isFilled = Boolean(props.value || props.defaultValue);
    const isFloating = focused || isFilled;
    const inputType = type === "password" ? (showPassword ? "text" : "password") : type;

    const borderColor = error
        ? "oklch(0.62 0.24 22)"
        : success
            ? "oklch(0.72 0.19 165)"
            : focused
                ? "oklch(0.72 0.19 265)"
                : "oklch(0.98 0.01 260 / 12%)";

    const glowColor = error
        ? "oklch(0.62 0.24 22 / 35%)"
        : success
            ? "oklch(0.72 0.19 165 / 35%)"
            : "oklch(0.65 0.26 275 / 40%)";

    return (
        <div className="relative">
            <div
                className="relative flex items-center rounded-xl transition-all duration-300"
                style={{
                    background: "oklch(0.14 0.03 275 / 60%)",
                    border: `1.5px solid ${borderColor}`,
                    boxShadow: focused ? `0 0 0 3px ${glowColor}, inset 0 1px 0 oklch(1 0 0 / 4%)` : "none",
                    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
                }}
            >
                {/* Left icon */}
                <div className="flex h-14 w-12 flex-shrink-0 items-center justify-center">
                    <Icon
                        className="h-4 w-4 transition-colors duration-300"
                        style={{
                            color: focused
                                ? "oklch(0.72 0.19 265)"
                                : error
                                    ? "oklch(0.62 0.24 22)"
                                    : "oklch(0.72 0.03 265)",
                        }}
                    />
                </div>

                {/* Input + Floating Label */}
                <div className="relative flex-1">
                    <motion.label
                        animate={{
                            y: isFloating ? -10 : 0,
                            scale: isFloating ? 0.78 : 1,
                            color: isFloating
                                ? error
                                    ? "oklch(0.62 0.24 22)"
                                    : "oklch(0.72 0.19 265)"
                                : "oklch(0.72 0.03 265)",
                        }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="pointer-events-none absolute left-0 top-1/2 origin-left -translate-y-1/2 text-sm font-medium"
                    >
                        {label}
                    </motion.label>
                    <input
                        ref={ref}
                        type={inputType}
                        {...props}
                        onFocus={(e) => {
                            setFocused(true);
                            props.onFocus?.(e);
                        }}
                        onBlur={(e) => {
                            setFocused(false);
                            props.onBlur?.(e);
                        }}
                        className={cn(
                            "h-14 w-full bg-transparent pt-4 text-sm text-foreground outline-none placeholder-transparent",
                            className
                        )}
                    />
                </div>

                {/* Password toggle */}
                {type === "password" && (
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="flex h-14 w-12 flex-shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                )}

                {/* Success/error indicator */}
                {(success || error) && (
                    <div className="mr-3 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full">
                        {success && !error && (
                            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                                <path
                                    d="M2 6l3 3 5-5"
                                    stroke="oklch(0.72 0.19 165)"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        )}
                    </div>
                )}
            </div>

            {/* Error message */}
            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="mt-1.5 pl-1 text-xs"
                        style={{ color: "oklch(0.62 0.24 22)" }}
                        role="alert"
                    >
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
});

FloatingLabelInput.displayName = "FloatingLabelInput";
