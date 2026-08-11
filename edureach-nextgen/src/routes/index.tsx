import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CalendarRange,
  FileText,
  Bot,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduReach NextGen — AI teacher cockpit & student study OS" },
      {
        name: "description",
        content:
          "Plan lessons, generate worksheets and coach students with AI. One workspace for teachers and learners.",
      },
      { property: "og:title", content: "EduReach NextGen — AI teaching & study workspace" },
      {
        property: "og:description",
        content:
          "A teacher cockpit for classrooms, planning and worksheets, plus a student study OS with an AI coach.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: CalendarRange,
    title: "Weekly planner",
    body: "Draft a realistic week of teaching in seconds, then tweak it to fit your class.",
    tint: "text-cyan",
  },
  {
    icon: FileText,
    title: "Worksheets & tests",
    body: "Generate graded questions with an answer key, ready to print or share.",
    tint: "text-violet",
  },
  {
    icon: Bot,
    title: "AI study coach",
    body: "Students describe what they're stuck on and get concrete, time-boxed next steps.",
    tint: "text-mint",
  },
  {
    icon: Target,
    title: "Focus sessions",
    body: "Built-in timer and task board so study time actually turns into progress.",
    tint: "text-amber",
  },
];

function Landing() {
  const navigate = useNavigate();

  // A confirmed/returning user landing on "/" goes straight to their workspace.
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/workspace", replace: true });
    });
  }, [navigate]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <nav className="glass flex items-center justify-between rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="glow-cyan grid size-8 place-items-center rounded-lg bg-gradient-to-br from-cyan to-violet text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Edu<span className="text-cyan">Reach</span>
          </span>
        </div>
        <Link
          to="/auth"
          className="glow-cyan rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          Sign in
        </Link>
      </nav>

      <section className="animate-rise mt-16 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-xs font-medium text-mint">
          <Sparkles className="size-3" /> Powered by EduReach AI
        </span>
        <h1 className="mt-6 text-balance text-5xl font-bold tracking-tight sm:text-6xl">
          One workspace for{" "}
          <span className="bg-gradient-to-r from-cyan to-violet bg-clip-text text-transparent">
            teaching and studying
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Run classrooms, generate lessons and worksheets, and give every learner an AI study
          coach — all saved to your account.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/auth"
            className="glow-cyan inline-flex items-center gap-2 rounded-xl bg-cyan px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
          >
            Get started free <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-xl border border-violet/40 px-5 py-3 text-sm font-semibold text-violet transition-all hover:bg-violet/10"
          >
            <ShieldCheck className="size-4" /> I'm a teacher
          </Link>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <article key={f.title} className="glass animate-rise rounded-2xl p-6">
            <div className="grid size-10 place-items-center rounded-xl bg-secondary/50">
              <f.icon className={`size-5 ${f.tint}`} />
            </div>
            <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </article>
        ))}
      </section>

      <footer className="mt-20 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        EduReach NextGen — built for teachers and learners.
      </footer>
    </main>
  );
}
