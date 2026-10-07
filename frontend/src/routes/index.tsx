import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Background } from "@/components/landing/Background";
import { MouseGlow } from "@/components/landing/MouseGlow";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CTA, Footer } from "@/components/landing/CTA";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "InterviewAI — Master Every Interview with AI" },
      {
        name: "description",
        content:
          "Practice interviews with Aether, your AI mentor. Upload your resume, run realistic voice interviews, and get personalized feedback to land your dream job.",
      },
      { property: "og:title", content: "InterviewAI — Master Every Interview with AI" },
      {
        property: "og:description",
        content:
          "A cinematic AI interview studio. Voice-first practice, real-time feedback, and a personalized roadmap to your dream offer.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Background />
      <MouseGlow />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
