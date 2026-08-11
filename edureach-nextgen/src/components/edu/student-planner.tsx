import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutGrid,
  CalendarDays,
  ListChecks,
  Calendar,
  BookOpen,
  StickyNote,
  Bot,
  BarChart3,
  Timer,
  Settings,
  Sparkles,
  Zap,
  Plus,
  ChevronLeft,
  ChevronRight,
  Flag,
  Compass,
  Repeat,
  Trophy,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal, EduButton, RichText, useToast } from "./ui-primitives";
import { TaskBoard, FocusTimer, CoachForm } from "./student-workspace";
import {
  createTask,
  deleteTask,
  generateContent,
  listClassrooms,
  listGenerated,
  listTasks,
  toggleTask,
  type GenerateContentInput,
} from "@/lib/edu.functions";

type Generated = Awaited<ReturnType<typeof listGenerated>>[number];
type Section =
  | "dashboard"
  | "planner"
  | "tasks"
  | "calendar"
  | "subjects"
  | "notes"
  | "coach"
  | "analytics"
  | "focus"
  | "settings";

const NAV: { key: Section; label: string; icon: typeof LayoutGrid; beta?: boolean }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "planner", label: "Planner", icon: CalendarDays },
  { key: "tasks", label: "Tasks", icon: ListChecks },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "subjects", label: "Subjects", icon: BookOpen },
  { key: "notes", label: "Notes", icon: StickyNote },
  { key: "coach", label: "AI Coach", icon: Bot, beta: true },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "focus", label: "Focus Timer", icon: Timer },
  { key: "settings", label: "Settings", icon: Settings },
];

const ROADMAP = [
  { icon: Flag, label: "Plan", hint: "Plan your week", color: "text-mint" },
  { icon: BookOpen, label: "Learn", hint: "Learn key topics", color: "text-cyan" },
  { icon: Repeat, label: "Revise", hint: "Review and summarise", color: "text-violet" },
  { icon: Compass, label: "Practice", hint: "Do practice tests", color: "text-amber" },
  { icon: Trophy, label: "Master", hint: "Track and improve", color: "text-mint" },
];

const DAY_TONES = [
  "text-amber ring-amber/50",
  "text-mint ring-mint/50",
  "text-cyan ring-cyan/50",
  "text-mint ring-mint/50",
  "text-cyan ring-cyan/50",
  "text-amber ring-amber/50",
  "text-violet ring-violet/50",
];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekStart(offset: number) {
  const d = new Date();
  const shift = (d.getDay() + 6) % 7; // Monday first
  d.setDate(d.getDate() - shift + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function StudentPlanner({ studentName }: { studentName: string }) {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("planner");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(iso(new Date()));
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<
    null | { kind: "plan" } | { kind: "coach"; seed?: string } | { kind: "output"; item: Generated }
  >(null);

  const fetchTasks = useServerFn(listTasks);
  const fetchGenerated = useServerFn(listGenerated);
  const fetchClassrooms = useServerFn(listClassrooms);
  const addTask = useServerFn(createTask);
  const flipTask = useServerFn(toggleTask);
  const removeTask = useServerFn(deleteTask);
  const generate = useServerFn(generateContent);

  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => fetchTasks() });
  const generated = useQuery({ queryKey: ["generated"], queryFn: () => fetchGenerated() });
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => fetchClassrooms() });

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
      notify("Your AI coach replied");
    },
    onError: fail,
  });

  const list = tasks.data ?? [];
  const today = iso(new Date());
  const todays = list.filter((t) => t.due_date === selectedDay);
  const todaysDone = todays.filter((t) => t.done).length;
  const upcoming = list
    .filter((t) => !t.done && t.due_date && t.due_date >= today)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 5);
  const doneCount = list.filter((t) => t.done).length;

  const days = useMemo(() => {
    const start = weekStart(weekOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = iso(d);
      return {
        key,
        name: d.toLocaleDateString(undefined, { weekday: "short" }),
        short: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        num: d.getDate(),
        count: list.filter((t) => t.due_date === key).length,
      };
    });
  }, [weekOffset, list]);

  const subjects = (classrooms.data ?? []).map((c, i) => ({
    name: c.subject || c.name,
    pct: Math.min(98, 45 + ((c.learners * 7 + i * 13) % 50)),
  }));

  const filteredNav = NAV.filter((n) =>
    search.trim() ? n.label.toLowerCase().includes(search.trim().toLowerCase()) : true,
  );

  const quickAdd = (label: string, priority: "High" | "Med" | "Low") =>
    createMut.mutate({ label, priority, due_date: selectedDay });

  return (
    <div className="min-h-screen">
      <div className="flex">
        {/* Sidebar */}
        <aside className="glass sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto rounded-none border-y-0 border-l-0 p-4 lg:flex">
          <div className="px-2 py-3 text-lg font-bold tracking-tight">
            <span className="text-mint">Edu</span>Reach
          </div>
          <nav className="mt-3 space-y-1">
            {filteredNav.map((n) => (
              <button
                key={n.key}
                type="button"
                onClick={() => setSection(n.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all",
                  section === n.key
                    ? "bg-mint/10 font-medium text-mint"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                )}
              >
                <n.icon className="size-4 shrink-0" />
                <span className="flex-1 text-left">{n.label}</span>
                {n.beta && (
                  <span className="rounded bg-violet/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-violet">
                    Beta
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick add
          </div>
          <div className="mt-2 space-y-1">
            {[
              { label: "Add study task", priority: "Med" as const, dot: "bg-mint" },
              { label: "Add class", priority: "Med" as const, dot: "bg-cyan" },
              { label: "Add note", priority: "Low" as const, dot: "bg-violet" },
              { label: "Add reminder", priority: "High" as const, dot: "bg-amber" },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => quickAdd(q.label.replace("Add ", "New "), q.priority)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-secondary/50 hover:text-foreground"
              >
                <Plus className="size-3" />
                <span className={cn("size-1.5 rounded-full", q.dot)} />
                {q.label}
              </button>
            ))}
          </div>

          <div className="glass mt-6 rounded-2xl p-4">
            <Rocket className="size-4 text-cyan" />
            <p className="mt-2 text-xs font-semibold">Level up your focus</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Keep your plan realistic, colourful and consistent.
            </p>
            <EduButton
              variant="outline"
              className="mt-3 w-full !py-1.5 !text-xs"
              onClick={() => setSection("analytics")}
            >
              View progress
            </EduButton>
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1">
          <header className="glass sticky top-0 z-20 flex flex-wrap items-center gap-4 rounded-none border-x-0 border-t-0 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight">
                Plan your week <span className="text-amber">✦</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Stay focused, stay consistent, achieve more.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search anything…"
                className="input-glow hidden !py-1.5 !text-xs sm:block sm:w-56"
              />
              <div className="grid size-8 place-items-center rounded-full bg-mint/15 text-xs font-semibold text-mint">
                {studentName.slice(0, 1).toUpperCase()}
              </div>
            </div>
          </header>

          <div className="space-y-5 p-4 sm:p-6">
            {(section === "dashboard" || section === "planner") && (
              <>
                <div className="grid gap-5 lg:grid-cols-[1fr_1.35fr]">
                  <section className="glass animate-rise relative overflow-hidden rounded-3xl p-6">
                    <div className="absolute -left-10 -top-10 size-40 rounded-full bg-mint/20 blur-3xl" />
                    <div className="relative">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-mint">
                        Next best action
                      </p>
                      <div className="mt-3 flex items-start gap-4">
                        <div className="grid size-11 shrink-0 place-items-center rounded-full border border-mint/40 bg-mint/10">
                          <Zap className="size-5 text-mint" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold leading-snug">
                            {upcoming.length
                              ? `Plan ${upcoming.length} focus session${upcoming.length > 1 ? "s" : ""} and clear "${upcoming[0]!.label}".`
                              : "Add your first task and plan a focus session."}
                          </h2>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            Small steps today lead to big results tomorrow. You've got this — make
                            this week count.
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <EduButton
                          variant="mint"
                          icon={<Sparkles className="size-4" />}
                          onClick={() => setModal({ kind: "plan" })}
                        >
                          Start planning
                        </EduButton>
                        <EduButton variant="ghost" onClick={() => setSection("analytics")}>
                          View roadmap →
                        </EduButton>
                      </div>
                    </div>
                  </section>

                  <section className="glass animate-rise rounded-3xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold">Week at a glance</h2>
                        <p className="text-[11px] text-muted-foreground">
                          {days[0]!.short} – {days[6]!.short}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Previous week"
                          onClick={() => setWeekOffset((w) => w - 1)}
                          className="grid size-7 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Next week"
                          onClick={() => setWeekOffset((w) => w + 1)}
                          className="grid size-7 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSection("calendar")}
                          className="ml-1 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          View calendar
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {days.map((d, i) => (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setSelectedDay(d.key)}
                          className={cn(
                            "rounded-2xl border p-2 text-center transition-all",
                            selectedDay === d.key
                              ? "border-cyan/50 bg-cyan/5"
                              : "border-border hover:border-cyan/30",
                          )}
                        >
                          <p className="text-[11px] font-medium">{d.name}</p>
                          <p className="text-[9px] text-muted-foreground">{d.short}</p>
                          <span
                            className={cn(
                              "mx-auto mt-2 grid size-9 place-items-center rounded-full text-sm font-semibold ring-2",
                              DAY_TONES[i],
                            )}
                          >
                            {d.num}
                          </span>
                          <p className="mt-1 text-[9px] text-muted-foreground">{d.count} tasks</p>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="grid gap-5 lg:grid-cols-4">
                  <section className="glass animate-rise rounded-3xl p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-sm font-semibold">
                        <ListChecks className="size-4 text-mint" /> Today's tasks
                      </h2>
                      <span className="text-[11px] text-muted-foreground">
                        {todaysDone}/{todays.length} completed
                      </span>
                    </div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary/60">
                      <div
                        className="h-full rounded-full bg-mint transition-all"
                        style={{
                          width: `${todays.length ? (todaysDone / todays.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="mt-4 space-y-2">
                      {todays.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleMut.mutate({ id: t.id, done: !t.done })}
                          className="surface-row flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
                        >
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              t.done ? "bg-mint" : "bg-amber",
                            )}
                          />
                          <span className={cn("truncate", t.done && "line-through opacity-60")}>
                            {t.label}
                          </span>
                        </button>
                      ))}
                      {todays.length === 0 && (
                        <p className="py-6 text-center text-[11px] text-muted-foreground">
                          Nothing planned for this day.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection("tasks")}
                      className="mt-4 w-full text-center text-xs font-medium text-mint hover:underline"
                    >
                      + Add new task
                    </button>
                  </section>

                  <section className="glass animate-rise rounded-3xl p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                      <CalendarDays className="size-4 text-cyan" /> Upcoming deadlines
                    </h2>
                    <div className="mt-4 space-y-3">
                      {upcoming.map((t, i) => (
                        <div key={t.id} className="flex items-center gap-2 text-xs">
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              ["bg-amber", "bg-cyan", "bg-violet", "bg-mint", "bg-amber"][i % 5],
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate">{t.label}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {new Date(`${t.due_date}T00:00:00`).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      ))}
                      {upcoming.length === 0 && (
                        <p className="py-6 text-center text-[11px] text-muted-foreground">
                          No deadlines coming up.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection("tasks")}
                      className="mt-4 w-full text-center text-xs font-medium text-cyan hover:underline"
                    >
                      + Add reminder
                    </button>
                  </section>

                  <div className="lg:col-span-1">
                    <FocusTimer
                      onComplete={() => notify("Focus session complete — take a short break!")}
                    />
                  </div>

                  <section className="glass animate-rise rounded-3xl p-5">
                    <h2 className="text-sm font-semibold">Study roadmap</h2>
                    <div className="mt-5 space-y-4">
                      {ROADMAP.map((r) => (
                        <div key={r.label} className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border">
                            <r.icon className={cn("size-4", r.color)} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold">{r.label}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{r.hint}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr_1fr]">
                  <section className="glass animate-rise rounded-3xl p-5">
                    <h2 className="text-sm font-semibold">Subject progress</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {subjects.map((s) => (
                        <div key={s.name} className="surface-row px-3 py-3 text-center">
                          <p className="truncate text-[11px] font-medium">{s.name}</p>
                          <div className="mx-auto mt-3 grid size-16 place-items-center rounded-full border-4 border-mint/60">
                            <span className="text-sm font-bold">{s.pct}%</span>
                          </div>
                        </div>
                      ))}
                      {subjects.length === 0 && (
                        <p className="col-span-full py-6 text-center text-[11px] text-muted-foreground">
                          Add classes in the teacher cockpit to see subject progress.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="glass animate-rise rounded-3xl p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                      <StickyNote className="size-4 text-cyan" /> Study notes
                    </h2>
                    <div className="mt-4 space-y-2">
                      {(generated.data ?? []).slice(0, 4).map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setModal({ kind: "output", item: g })}
                          className="surface-row w-full px-3 py-2 text-left"
                        >
                          <p className="truncate text-xs font-medium">{g.title}</p>
                          <p className="text-[10px] capitalize text-muted-foreground">{g.kind}</p>
                        </button>
                      ))}
                      {(generated.data ?? []).length === 0 && (
                        <p className="py-6 text-center text-[11px] text-muted-foreground">
                          No notes yet — ask your AI coach.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setModal({ kind: "coach" })}
                      className="mt-4 w-full text-center text-xs font-medium text-cyan hover:underline"
                    >
                      + Add new note
                    </button>
                  </section>

                  <section className="glass animate-rise rounded-3xl p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles className="size-4 text-violet" /> AI planning coach
                      <span className="rounded bg-violet/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-violet">
                        Beta
                      </span>
                    </h2>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      I can help you plan smarter and stay consistent.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        "Plan my week",
                        "Balance my subjects",
                        "Find focus time",
                        "Study tips",
                      ].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setModal({ kind: "coach", seed: p })}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] transition-all hover:border-violet/50 hover:text-violet"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="glass animate-rise rounded-3xl p-5">
                  <h2 className="text-sm font-semibold">Insights</h2>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      { k: "Tasks completed", v: `${doneCount}` },
                      { k: "Open tasks", v: `${list.length - doneCount}` },
                      { k: "This week", v: `${days.reduce((n, d) => n + d.count, 0)}` },
                      { k: "AI docs", v: `${(generated.data ?? []).length}` },
                    ].map((s) => (
                      <div key={s.k} className="surface-row px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {s.k}
                        </p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">{s.v}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {section === "tasks" && (
              <TaskBoard
                tasks={list}
                loading={tasks.isLoading}
                busy={createMut.isPending}
                onCreate={(t) => createMut.mutate(t)}
                onToggle={(t) => toggleMut.mutate({ id: t.id, done: !t.done })}
                onDelete={(id) => deleteMut.mutate(id)}
              />
            )}

            {section === "calendar" && (
              <section className="glass rounded-3xl p-6">
                <h2 className="text-sm font-semibold">Calendar</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-7">
                  {days.map((d) => (
                    <div key={d.key} className="surface-row min-h-32 p-3">
                      <p className="text-xs font-semibold">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">{d.short}</p>
                      <div className="mt-2 space-y-1">
                        {list
                          .filter((t) => t.due_date === d.key)
                          .map((t) => (
                            <p
                              key={t.id}
                              className={cn(
                                "truncate rounded bg-cyan/10 px-1.5 py-1 text-[10px] text-cyan",
                                t.done && "bg-mint/10 text-mint line-through",
                              )}
                            >
                              {t.label}
                            </p>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {section === "subjects" && (
              <section className="glass rounded-3xl p-6">
                <h2 className="text-sm font-semibold">Subjects</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(classrooms.data ?? []).map((c) => (
                    <div key={c.id} className="surface-row p-4">
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.subject} · {c.grade} · {c.learners} learners
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">{c.topic}</p>
                    </div>
                  ))}
                  {(classrooms.data ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">No classes yet.</p>
                  )}
                </div>
              </section>
            )}

            {section === "notes" && (
              <section className="glass rounded-3xl p-6">
                <h2 className="text-sm font-semibold">Notes &amp; AI documents</h2>
                <div className="mt-4 space-y-2">
                  {(generated.data ?? []).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setModal({ kind: "output", item: g })}
                      className="surface-row w-full px-4 py-3 text-left"
                    >
                      <p className="text-sm font-medium">{g.title}</p>
                      <p className="text-xs capitalize text-muted-foreground">{g.kind}</p>
                    </button>
                  ))}
                  {(generated.data ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nothing yet — ask the AI coach to draft something.
                    </p>
                  )}
                </div>
              </section>
            )}

            {section === "coach" && (
              <section className="glass mx-auto max-w-2xl rounded-3xl p-6">
                <h2 className="text-sm font-semibold">AI study coach</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ask anything — plans, explanations, revision strategies.
                </p>
                <div className="mt-5">
                  <CoachForm busy={generateMut.isPending} onSubmit={(v) => generateMut.mutate(v)} />
                </div>
              </section>
            )}

            {section === "analytics" && (
              <section className="glass rounded-3xl p-6">
                <h2 className="text-sm font-semibold">Analytics</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {[
                    { k: "Completion rate", v: `${list.length ? Math.round((doneCount / list.length) * 100) : 0}%` },
                    { k: "Total tasks", v: `${list.length}` },
                    { k: "AI documents", v: `${(generated.data ?? []).length}` },
                  ].map((s) => (
                    <div key={s.k} className="surface-row px-4 py-4">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {s.k}
                      </p>
                      <p className="mt-1 text-3xl font-bold tabular-nums">{s.v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-5">
                  {ROADMAP.map((r) => (
                    <div key={r.label} className="surface-row p-4 text-center">
                      <r.icon className={cn("mx-auto size-5", r.color)} />
                      <p className="mt-2 text-xs font-semibold">{r.label}</p>
                      <p className="text-[10px] text-muted-foreground">{r.hint}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {section === "focus" && (
              <div className="mx-auto max-w-sm">
                <FocusTimer onComplete={() => notify("Focus session complete — nice work!")} />
              </div>
            )}

            {section === "settings" && (
              <section className="glass mx-auto max-w-lg rounded-3xl p-6">
                <h2 className="text-sm font-semibold">Settings</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="surface-row px-4 py-3">
                    <p className="text-xs text-muted-foreground">Signed in as</p>
                    <p className="font-medium">{studentName}</p>
                  </div>
                  <div className="surface-row px-4 py-3">
                    <p className="text-xs text-muted-foreground">Default focus length</p>
                    <p className="font-medium">25 minutes (Pomodoro)</p>
                  </div>
                  <div className="surface-row px-4 py-3">
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p className="font-medium">Synced to your EduReach account</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={modal?.kind === "plan"}
        onClose={() => setModal(null)}
        title="Start planning"
        description="EduReach AI will draft a realistic week for you."
      >
        <PlanForm busy={generateMut.isPending} onSubmit={(v) => generateMut.mutate(v)} />
      </Modal>

      <Modal
        open={modal?.kind === "coach"}
        onClose={() => setModal(null)}
        title="AI planning coach"
        description="Tell your coach what you need."
      >
        <CoachForm
          key={modal?.kind === "coach" ? (modal.seed ?? "blank") : "closed"}
          busy={generateMut.isPending}
          seed={modal?.kind === "coach" ? modal.seed : undefined}
          onSubmit={(v) => generateMut.mutate(v)}
        />
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

function PlanForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (v: GenerateContentInput) => void;
}) {
  const [goal, setGoal] = useState("");
  return (
    <div className="space-y-4">
      <textarea
        rows={4}
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="e.g. Balance maths revision and my English essay this week"
        className="input-glow resize-none"
      />
      <EduButton
        variant="mint"
        className="w-full"
        loading={busy}
        disabled={!goal.trim()}
        icon={<Sparkles className="size-4" />}
        onClick={() =>
          onSubmit({
            kind: "plan",
            title: goal.trim().slice(0, 80),
            detail: goal.trim(),
            subject: "",
            grade: "",
            questions: 5,
          })
        }
      >
        {busy ? "Planning…" : "Build my week"}
      </EduButton>
    </div>
  );
}
