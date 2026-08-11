import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Circle,
  Target,
  Flame,
  Bot,
  Loader2,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal, Field, EduButton, RichText, useToast } from "./ui-primitives";
import { GenerateForm } from "./teacher-cockpit";
import {
  createTask,
  deleteTask,
  generateContent,
  listGenerated,
  listTasks,
  toggleTask,
  type GenerateContentInput,
} from "@/lib/edu.functions";

type Task = Awaited<ReturnType<typeof listTasks>>[number];
type Generated = Awaited<ReturnType<typeof listGenerated>>[number];

export function StudentWorkspace({ studentName }: { studentName: string }) {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState<
    null | { kind: "plan" } | { kind: "coach" } | { kind: "output"; item: Generated }
  >(null);

  const fetchTasks = useServerFn(listTasks);
  const fetchGenerated = useServerFn(listGenerated);
  const addTask = useServerFn(createTask);
  const flipTask = useServerFn(toggleTask);
  const removeTask = useServerFn(deleteTask);
  const generate = useServerFn(generateContent);

  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => fetchTasks() });
  const generated = useQuery({ queryKey: ["generated"], queryFn: () => fetchGenerated() });

  const fail = (e: unknown) =>
    notify(e instanceof Error ? e.message : "Something went wrong", "error");

  const createMut = useMutation({
    mutationFn: (input: { label: string; priority: "High" | "Med" | "Low"; due_date: string | null }) =>
      addTask({ data: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      notify("Task added to your plan");
    },
    onError: fail,
  });

  const toggleMut = useMutation({
    mutationFn: (input: { id: string; done: boolean }) => flipTask({ data: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: fail,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => removeTask({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      notify("Task removed");
    },
    onError: fail,
  });

  const generateMut = useMutation({
    mutationFn: (input: GenerateContentInput) => generate({ data: input }),
    onSuccess: (item) => {
      void qc.invalidateQueries({ queryKey: ["generated"] });
      if (item) setModal({ kind: "output", item });
      notify("Your study coach replied");
    },
    onError: fail,
  });

  const list = tasks.data ?? [];
  const done = list.filter((t) => t.done).length;
  const progress = list.length ? Math.round((done / list.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="glass animate-rise relative overflow-hidden rounded-3xl p-6 sm:p-8">
            <div className="absolute -left-16 -top-16 size-56 rounded-full bg-cyan/20 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-xs font-medium text-violet">
                <Sparkles className="size-3" /> Study OS
              </span>
              <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                Let's get focused, {studentName.split(" ")[0]}.
              </h1>
              <p className="mt-3 max-w-md text-pretty leading-relaxed text-muted-foreground">
                Track your tasks, run a focus session, and ask your AI study coach whenever you
                get stuck.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <EduButton
                  variant="violet"
                  icon={<Bot className="size-4" />}
                  onClick={() => setModal({ kind: "coach" })}
                >
                  Ask my study coach
                </EduButton>
                <EduButton
                  variant="ghost"
                  icon={<Target className="size-4" />}
                  onClick={() => setModal({ kind: "plan" })}
                >
                  Build a study plan
                </EduButton>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Today's progress</span>
                  <span className="tabular-nums">
                    {done}/{list.length} done
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan to-violet transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <TaskBoard
            tasks={list}
            loading={tasks.isLoading}
            busy={createMut.isPending}
            onCreate={(t) => createMut.mutate(t)}
            onToggle={(t) => toggleMut.mutate({ id: t.id, done: !t.done })}
            onDelete={(id) => deleteMut.mutate(id)}
          />
        </div>

        <div className="space-y-6">
          <FocusTimer onComplete={() => notify("Focus session complete — take a short break!")} />
          <StreakCard done={done} total={list.length} />
          <section className="glass animate-rise rounded-3xl p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="size-4 text-violet" /> My study docs
            </h2>
            <div className="space-y-2">
              {(generated.data ?? []).slice(0, 5).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setModal({ kind: "output", item: g })}
                  className="surface-row flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:border-violet/40"
                >
                  <span className="truncate">{g.title}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
              {(generated.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nothing yet — ask your coach or build a study plan.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={modal?.kind === "plan"}
        onClose={() => setModal(null)}
        title="Build a study plan"
        description="EduReach AI will draft a realistic week for you."
      >
        <GenerateForm
          kind="plan"
          busy={generateMut.isPending}
          titleLabel="What are you preparing for?"
          titlePlaceholder="e.g. End of term maths exam"
          onSubmit={(v) => generateMut.mutate(v)}
        />
      </Modal>

      <Modal
        open={modal?.kind === "coach"}
        onClose={() => setModal(null)}
        title="AI study coach"
        description="Tell your coach what you're stuck on."
      >
        <CoachForm busy={generateMut.isPending} onSubmit={(v) => generateMut.mutate(v)} />
      </Modal>

      <Modal
        open={modal?.kind === "output"}
        onClose={() => setModal(null)}
        title={modal?.kind === "output" ? modal.item.title : ""}
        description={modal?.kind === "output" ? `AI ${modal.item.kind}` : ""}
        wide
      >
        {modal?.kind === "output" && <RichText text={modal.item.content} />}
      </Modal>
    </div>
  );
}

export function CoachForm({
  busy,
  onSubmit,
  seed,
}: {
  busy: boolean;
  onSubmit: (v: GenerateContentInput) => void;
  seed?: string | undefined;
}) {
  const [question, setQuestion] = useState(seed ?? "");
  return (
    <div className="space-y-4">
      <Field label="What do you need help with?">
        <textarea
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. I keep forgetting how to factorise quadratics"
          className="input-glow resize-none"
        />
      </Field>
      <EduButton
        variant="violet"
        className="w-full"
        loading={busy}
        disabled={!question.trim()}
        icon={<Bot className="size-4" />}
        onClick={() =>
          onSubmit({
            kind: "coach",
            title: question.trim().slice(0, 80),
            detail: question.trim(),
            subject: "",
            grade: "",
            questions: 5,
          })
        }
      >
        {busy ? "Coach is thinking…" : "Ask my coach"}
      </EduButton>
    </div>
  );
}

export function TaskBoard({
  tasks,
  loading,
  busy,
  onCreate,
  onToggle,
  onDelete,
}: {
  tasks: Task[];
  loading: boolean;
  busy: boolean;
  onCreate: (t: { label: string; priority: "High" | "Med" | "Low"; due_date: string | null }) => void;
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [priority, setPriority] = useState<"High" | "Med" | "Low">("Med");
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");

  const shown = useMemo(
    () =>
      tasks.filter((t) => (filter === "all" ? true : filter === "done" ? t.done : !t.done)),
    [tasks, filter],
  );

  function add() {
    if (!label.trim()) return;
    onCreate({ label: label.trim(), priority, due_date: null });
    setLabel("");
  }

  return (
    <section className="glass animate-rise rounded-3xl p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">My tasks</h2>
        <div className="flex gap-1 rounded-full border border-border p-1">
          {(["all", "open", "done"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-all",
                filter === f ? "bg-cyan/15 text-cyan" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1.6fr_1fr_auto]">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="Add a task…"
          className="input-glow"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as "High" | "Med" | "Low")}
          aria-label="Priority"
          className="input-glow"
        >
          <option value="High">High priority</option>
          <option value="Med">Medium priority</option>
          <option value="Low">Low priority</option>
        </select>
        <EduButton loading={busy} icon={<Plus className="size-4" />} onClick={add}>
          Add
        </EduButton>
      </div>

      <div className="mt-5 space-y-2">
        {shown.map((t) => (
          <div key={t.id} className="surface-row flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              aria-label={t.done ? "Mark as not done" : "Mark as done"}
              onClick={() => onToggle(t)}
              className="shrink-0"
            >
              {t.done ? (
                <CheckCircle2 className="size-5 text-mint" />
              ) : (
                <Circle className="size-5 text-muted-foreground transition-colors hover:text-cyan" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-sm", t.done && "text-muted-foreground line-through")}>
                {t.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.priority} priority
                {t.due_date ? ` · due ${t.due_date}` : ""}
              </p>
            </div>
            <button
              type="button"
              aria-label="Delete task"
              onClick={() => onDelete(t.id)}
              className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-all hover:border-destructive/50 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {loading && (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading your tasks…
          </p>
        )}
        {!loading && shown.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing here yet — add your first task above.
          </p>
        )}
      </div>
    </section>
  );
}

export function FocusTimer({ onComplete }: { onComplete: () => void }) {
  const [minutes, setMinutes] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          if (!doneRef.current) {
            doneRef.current = true;
            onComplete();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onComplete]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const pct = minutes > 0 ? 100 - Math.round((left / (minutes * 60)) * 100) : 0;

  return (
    <section className="glass animate-rise rounded-3xl p-5 text-center">
      <h2 className="flex items-center justify-center gap-2 text-sm font-semibold">
        <Target className="size-4 text-cyan" /> Focus session
      </h2>
      <p className="mt-4 text-5xl font-bold tabular-nums tracking-tight">
        {mm}:{ss}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan to-mint transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {[15, 25, 45].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMinutes(m);
              setLeft(m * 60);
              setRunning(false);
              doneRef.current = false;
            }}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all",
              minutes === m
                ? "bg-cyan/15 text-cyan"
                : "border border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {m}m
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <EduButton
          className="flex-1"
          icon={running ? <Pause className="size-4" /> : <Play className="size-4" />}
          onClick={() => {
            doneRef.current = false;
            setRunning((r) => !r);
          }}
        >
          {running ? "Pause" : "Start"}
        </EduButton>
        <EduButton
          variant="ghost"
          aria-label="Reset timer"
          icon={<RotateCcw className="size-4" />}
          onClick={() => {
            setRunning(false);
            setLeft(minutes * 60);
            doneRef.current = false;
          }}
        >
          Reset
        </EduButton>
      </div>
    </section>
  );
}

function StreakCard({ done, total }: { done: number; total: number }) {
  return (
    <section className="glass animate-rise relative overflow-hidden rounded-3xl p-5">
      <div className="absolute -right-8 -top-8 size-28 rounded-full bg-amber/20 blur-2xl" />
      <div className="relative flex items-center gap-2">
        <Flame className="size-4 text-amber" />
        <h2 className="text-sm font-semibold">Momentum</h2>
      </div>
      <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
        {total === 0
          ? "Add your first task to start building momentum."
          : done === total
            ? "Every task done. Outstanding work — go rest."
            : `${done} of ${total} tasks complete. Keep going, you're closer than you think.`}
      </p>
    </section>
  );
}