import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Field } from "@/components/edu/ui-primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — EduReach NextGen" },
      {
        name: "description",
        content:
          "Sign in to EduReach NextGen to open your teacher cockpit or student study planner.",
      },
      { property: "og:title", content: "Sign in — EduReach NextGen" },
      {
        property: "og:description",
        content: "Access your EduReach teacher cockpit and student study planner.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) void navigate({ to: "/workspace" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void navigate({ to: "/workspace" });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || password.length < 6) {
      setError("Enter an email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() || email.split("@")[0] },
          },
        });
        if (err) throw err;
        if (!data.session) {
          setInfo("Account created. Check your inbox to confirm, then sign in.");
          setMode("signin");
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError("");
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Google sign-in is unavailable right now.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/workspace" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="glass animate-rise w-full max-w-md rounded-3xl p-7">
        <Link to="/" className="flex items-center gap-2">
          <span className="glow-cyan grid size-9 place-items-center rounded-xl bg-gradient-to-br from-cyan to-violet text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Edu<span className="text-cyan">Reach</span>
          </span>
        </Link>

        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to open your cockpit and planner."
            : "Set up your teacher cockpit and student study OS."}
        </p>

        <button
          type="button"
          onClick={() => void google()}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm font-medium transition-all hover:border-foreground/25 disabled:opacity-50"
        >
          <GoogleMark /> Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or use email{" "}
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {mode === "signup" && (
            <Field label="Full name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Person"
                className="input-glow"
                autoComplete="name"
              />
            </Field>
          )}
          <Field label="Email">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="input-glow pl-9"
                autoComplete="email"
              />
            </div>
          </Field>
          <Field label="Password">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="input-glow pl-9"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
          </Field>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {info && <p className="text-xs text-mint">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className={cn(
              "glow-cyan flex w-full items-center justify-center gap-2 rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all",
              "hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to EduReach?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
              setInfo("");
            }}
            className="font-semibold text-cyan hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1A6.2 6.2 0 1 1 12 5.8c1.7 0 3 .7 3.8 1.4l2.7-2.6A9.6 9.6 0 0 0 12 2a10 10 0 0 0 0 20c5.8 0 9.6-4 9.6-9.7 0-.7-.1-1.3-.2-1.9H12Z"
      />
    </svg>
  );
}