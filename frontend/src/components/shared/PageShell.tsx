import { Background } from "@/components/landing/Background";
import { MouseGlow } from "@/components/landing/MouseGlow";
import { Navbar } from "@/components/landing/Navbar";
import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Background />
      <MouseGlow />
      <Navbar />
      <main className="relative z-10 pt-28 pb-16">{children}</main>
    </div>
  );
}
