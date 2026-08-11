import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, ShieldCheck, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ToastProvider } from "@/components/edu/ui-primitives";
import { TeacherCockpit } from "@/components/edu/teacher-cockpit";
import { StudentPlanner } from "@/components/edu/student-planner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({
    meta: [
      { title: "Workspace — EduReach NextGen" },
      {
        name: "description",
        content:
          "Your EduReach workspace: run the teacher cockpit or the student study OS with AI planning built in.",
      },
      { property: "og:title", content: "Workspace — EduReach NextGen" },
      {
        property: "og:description",
        content: "Teacher cockpit and student study OS with AI lesson, worksheet and plan generation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const navigate = useNavigate();
  const [portal, setPortal] = useState<"teacher" | "student">("teacher");
  const [name, setName] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { full_name?: string } | undefined;
      setName(meta?.full_name || data.user?.email?.split("@")[0] || "there");
    });
    const saved = window.localStorage.getItem("edureach-portal");
    if (saved === "student" || saved === "teacher") setPortal(saved);
  }, []);

  function choose(next: "teacher" | "student") {
    setPortal(next);
    window.localStorage.setItem("edureach-portal", next);
  }

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  }

  return (
    <ToastProvider>
      <div className="min-h-screen pt-6">
        <div className="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="glass flex gap-1 rounded-full p-1">
            {(
              [
                { key: "teacher", label: "Teacher cockpit", icon: ShieldCheck },
                { key: "student", label: "Student study OS", icon: GraduationCap },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => choose(p.key)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  portal === p.key
                    ? "glow-cyan bg-cyan text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <p.icon className="size-4" />
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-all hover:border-destructive/50 hover:text-destructive disabled:opacity-50"
          >
            {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            Sign out
          </button>
        </div>

        {portal === "teacher" ? (
          <TeacherCockpit teacherName={name || "there"} />
        ) : (
          <StudentPlanner studentName={name || "there"} />
        )}
      </div>
    </ToastProvider>
  );
}