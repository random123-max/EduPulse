import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  MessageSquare,
  Clock,
  CalendarRange,
  FileText,
  BookOpen,
  Plus,
  Lightbulb,
  Send,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal, Field, EduButton, RichText, useToast } from "./ui-primitives";
import {
  createAnnouncement,
  createClassroom,
  deleteClassroom,
  generateContent,
  listAnnouncements,
  listClassrooms,
  listGenerated,
  updateClassroom,
  type GenerateContentInput,
} from "@/lib/edu.functions";

type Classroom = Awaited<ReturnType<typeof listClassrooms>>[number];
type Generated = Awaited<ReturnType<typeof listGenerated>>[number];

const TINTS = ["from-cyan/15", "from-violet/15", "from-mint/15", "from-amber/15"];

type ModalState =
  | null
  | { kind: "planner" }
  | { kind: "worksheet" }
  | { kind: "lesson" }
  | { kind: "classrooms" }
  | { kind: "room"; room: Classroom }
  | { kind: "output"; item: Generated }
  | { kind: "library" };

export function TeacherCockpit({ teacherName }: { teacherName: string }) {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState<ModalState>(null);
  const [sortRecent, setSortRecent] = useState(true);

  const fetchRooms = useServerFn(listClassrooms);
  const fetchAnnouncements = useServerFn(listAnnouncements);
  const fetchGenerated = useServerFn(listGenerated);
  const addRoom = useServerFn(createClassroom);
  const removeRoom = useServerFn(deleteClassroom);
  const patchRoom = useServerFn(updateClassroom);
  const addAnnouncement = useServerFn(createAnnouncement);
  const generate = useServerFn(generateContent);

  const rooms = useQuery({ queryKey: ["classrooms"], queryFn: () => fetchRooms() });
  const announcements = useQuery({
    queryKey: ["announcements"],
    queryFn: () => fetchAnnouncements(),
  });
  const generated = useQuery({ queryKey: ["generated"], queryFn: () => fetchGenerated() });

  const fail = (e: unknown) => notify(e instanceof Error ? e.message : "Something went wrong", "error");

  const createRoomMut = useMutation({
    mutationFn: (input: { name: string; subject: string; grade: string; topic: string }) =>
      addRoom({ data: input }),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["classrooms"] });
      notify(`Workspace "${row?.name ?? "classroom"}" created`);
    },
    onError: fail,
  });

  const deleteRoomMut = useMutation({
    mutationFn: (id: string) => removeRoom({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["classrooms"] });
      notify("Classroom removed");
    },
    onError: fail,
  });

  const enrolMut = useMutation({
    mutationFn: (input: { id: string; learners: number }) => patchRoom({ data: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["classrooms"] });
      notify("Learner added to the classroom");
    },
    onError: fail,
  });

  const announceMut = useMutation({
    mutationFn: (body: string) => addAnnouncement({ data: { body, classroom_id: null } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["announcements"] });
      notify("Announcement sent to your learners");
    },
    onError: fail,
  });

  const generateMut = useMutation({
    mutationFn: (input: GenerateContentInput) => generate({ data: input }),
    onSuccess: (item) => {
      void qc.invalidateQueries({ queryKey: ["generated"] });
      if (item) setModal({ kind: "output", item });
      notify("EduReach AI finished writing");
    },
    onError: fail,
  });

  const list = rooms.data ?? [];
  const displayedRooms = useMemo(
    () => (sortRecent ? list : [...list].sort((a, b) => a.name.localeCompare(b.name))),
    [list, sortRecent],
  );

  const pendingDrafts = generated.data?.length ?? 0;
  const totalLearners = list.reduce((sum, r) => sum + r.learners, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <header className="glass animate-rise flex items-center justify-between gap-4 rounded-2xl px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="glow-cyan grid size-8 place-items-center rounded-lg bg-gradient-to-br from-cyan to-violet text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Edu<span className="text-cyan">Reach</span>
            </span>
          </div>
          <nav className="hidden items-center gap-5 md:flex">
            <button
              type="button"
              onClick={() => setModal({ kind: "classrooms" })}
              className="text-sm font-medium text-foreground transition-colors hover:text-cyan"
            >
              My Classrooms
            </button>
            <button
              type="button"
              onClick={() => setModal({ kind: "library" })}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-cyan"
            >
              AI Library
            </button>
          </nav>
        </div>
        <span className="hidden text-sm text-muted-foreground sm:block">{teacherName}</span>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <HeroCard
            teacherName={teacherName}
            rooms={list.length}
            learners={totalLearners}
            drafts={pendingDrafts}
            loading={rooms.isLoading}
            onAction={(kind) => setModal({ kind })}
          />
          <ClassroomGenerator
            busy={createRoomMut.isPending}
            onCreate={(c) => createRoomMut.mutate(c)}
          />
          <ActiveClassrooms
            rooms={displayedRooms}
            loading={rooms.isLoading}
            sortRecent={sortRecent}
            onToggleSort={() => setSortRecent((s) => !s)}
            onOpen={(room) => setModal({ kind: "room", room })}
          />
        </div>

        <div className="space-y-6">
          <QuickActions
            learners={totalLearners}
            drafts={pendingDrafts}
            onAnnounce={() => setModal({ kind: "planner" })}
            onViewAll={() => setModal({ kind: "classrooms" })}
            onLibrary={() => setModal({ kind: "library" })}
            onWorksheet={() => setModal({ kind: "worksheet" })}
          />
          <RecentActivity
            announcements={announcements.data ?? []}
            generated={generated.data ?? []}
          />
          <TeacherTip />
          <AnnouncementWidget
            busy={announceMut.isPending}
            onSend={(text) => announceMut.mutate(text)}
          />
        </div>
      </div>

      {/* ---- Modals ---- */}
      <Modal
        open={modal?.kind === "planner"}
        onClose={() => setModal(null)}
        title="Weekly planner"
        description="Let EduReach AI draft a realistic week of focus sessions."
      >
        <GenerateForm
          kind="plan"
          busy={generateMut.isPending}
          onSubmit={(v) => generateMut.mutate(v)}
          titleLabel="Week focus"
          titlePlaceholder="e.g. Quadratics revision week"
        />
      </Modal>

      <Modal
        open={modal?.kind === "worksheet"}
        onClose={() => setModal(null)}
        title="Create worksheet or test"
        description="Generate a ready-to-print worksheet with an answer key."
      >
        <GenerateForm
          kind="worksheet"
          busy={generateMut.isPending}
          withQuestions
          onSubmit={(v) => generateMut.mutate(v)}
          titleLabel="Worksheet title"
          titlePlaceholder="e.g. Algebra practice"
        />
      </Modal>

      <Modal
        open={modal?.kind === "lesson"}
        onClose={() => setModal(null)}
        title="Build lesson content"
        description="Outline a structured lesson your learners can follow."
      >
        <GenerateForm
          kind="lesson"
          busy={generateMut.isPending}
          onSubmit={(v) => generateMut.mutate(v)}
          titleLabel="Lesson title"
          titlePlaceholder="e.g. Intro to functions"
        />
      </Modal>

      <Modal
        open={modal?.kind === "classrooms"}
        onClose={() => setModal(null)}
        title="All classrooms"
        description={`${list.length} active learning ${list.length === 1 ? "space" : "spaces"}.`}
      >
        <div className="space-y-2">
          {list.map((r) => (
            <div key={r.id} className="surface-row flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.learners} learners · {r.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => enrolMut.mutate({ id: r.id, learners: r.learners + 1 })}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-all hover:border-cyan/50 hover:text-cyan"
                >
                  + learner
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${r.name}`}
                  onClick={() => deleteRoomMut.mutate(r.id)}
                  className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-all hover:border-destructive/50 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No classrooms yet. Create one to get started.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={modal?.kind === "room"}
        onClose={() => setModal(null)}
        title={modal?.kind === "room" ? modal.room.name : ""}
        description="Classroom overview"
      >
        {modal?.kind === "room" && (
          <div className="space-y-3 text-sm">
            {[
              ["Subject", modal.room.subject || "—"],
              ["Grade", modal.room.grade || "—"],
              ["This term", modal.room.topic || "—"],
              ["Learners", String(modal.room.learners)],
              ["Status", modal.room.status],
            ].map(([k, v]) => (
              <div key={k} className="surface-row flex justify-between gap-4 px-4 py-3">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-right font-medium">{v}</span>
              </div>
            ))}
            <EduButton
              icon={<Sparkles className="size-4" />}
              loading={generateMut.isPending}
              onClick={() =>
                generateMut.mutate({
                  kind: "lesson",
                  title: modal.room.topic || modal.room.name,
                  subject: modal.room.subject,
                  grade: modal.room.grade,
                  detail: `For the classroom "${modal.room.name}".`,
                  questions: 10,
                })
              }
              className="w-full"
            >
              Draft a lesson for this class
            </EduButton>
          </div>
        )}
      </Modal>

      <Modal
        open={modal?.kind === "library"}
        onClose={() => setModal(null)}
        title="AI library"
        description="Everything EduReach AI has written for you."
        wide
      >
        <div className="space-y-2">
          {(generated.data ?? []).map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setModal({ kind: "output", item: g })}
              className="surface-row flex w-full items-center justify-between px-4 py-3 text-left hover:border-cyan/40"
            >
              <div>
                <p className="text-sm font-medium">{g.title}</p>
                <p className="text-xs capitalize text-muted-foreground">{g.kind}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
          {(generated.data ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing generated yet — try the weekly planner or a worksheet.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={modal?.kind === "output"}
        onClose={() => setModal(null)}
        title={modal?.kind === "output" ? modal.item.title : ""}
        description={modal?.kind === "output" ? `AI ${modal.item.kind}` : ""}
        wide
      >
        {modal?.kind === "output" && (
          <div className="space-y-4">
            <RichText text={modal.item.content} />
            <EduButton
              variant="ghost"
              onClick={() => {
                void navigator.clipboard?.writeText(modal.item.content);
                notify("Copied to your clipboard");
              }}
              className="w-full"
            >
              Copy text
            </EduButton>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------------- sections ---------------- */

function HeroCard({
  teacherName,
  rooms,
  learners,
  drafts,
  loading,
  onAction,
}: {
  teacherName: string;
  rooms: number;
  learners: number;
  drafts: number;
  loading: boolean;
  onAction: (kind: "planner" | "worksheet" | "lesson") => void;
}) {
  const stats = [
    { label: "Rooms", sub: "Active classrooms", value: rooms, icon: Users, tint: "text-cyan", dot: true },
    { label: "Learners", sub: "Across all rooms", value: learners, icon: MessageSquare, tint: "text-violet" },
    { label: "AI docs", sub: "In your library", value: drafts, icon: Clock, tint: "text-mint" },
  ];
  return (
    <section className="glass animate-rise relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <div className="absolute -right-16 -top-16 size-56 rounded-full bg-violet/20 blur-3xl" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-xs font-medium text-mint">
          <Sparkles className="size-3" /> Live teacher cockpit
        </span>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Good to see you, {teacherName.split(" ")[0]}.
            </h1>
            <p className="mt-3 max-w-md text-pretty leading-relaxed text-muted-foreground">
              Manage classrooms, plan your week, and generate lessons and worksheets with
              EduReach AI — all saved to your account.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <EduButton icon={<CalendarRange className="size-4" />} onClick={() => onAction("planner")}>
                Open weekly planner
              </EduButton>
              <EduButton
                variant="outline"
                icon={<FileText className="size-4" />}
                onClick={() => onAction("worksheet")}
              >
                Create worksheet or test
              </EduButton>
              <EduButton
                variant="ghost"
                icon={<BookOpen className="size-4" />}
                onClick={() => onAction("lesson")}
              >
                Build lesson content
              </EduButton>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="glass rounded-2xl p-3 text-center transition-all hover:border-foreground/20">
                <div className="relative mx-auto grid size-9 place-items-center rounded-xl bg-secondary/50">
                  <s.icon className={cn("size-4", s.tint)} />
                  {s.dot && (
                    <span className="animate-pulse-soft absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-mint" />
                  )}
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums">
                  {loading ? <Loader2 className="mx-auto size-5 animate-spin" /> : s.value}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground/70">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ClassroomGenerator({
  onCreate,
  busy,
}: {
  onCreate: (c: { name: string; subject: string; grade: string; topic: string }) => void;
  busy: boolean;
}) {
  const [subject, setSubject] = useState("Mathematics");
  const [grade, setGrade] = useState("Year 10");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");

  const tags = [grade, subject, topic].filter(Boolean);

  function handleCreate() {
    if (!grade.trim() || !subject.trim() || !topic.trim()) {
      setError("Please fill in grade, subject, and topic.");
      return;
    }
    setError("");
    onCreate({
      name: `${grade.trim()} ${subject.trim()}`,
      subject: subject.trim(),
      grade: grade.trim(),
      topic: topic.trim(),
    });
    setTopic("");
  }

  return (
    <section className="glass animate-rise rounded-3xl p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet/15 text-violet">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Classroom generator</h2>
          <p className="text-sm text-muted-foreground">
            Start a new learning space and invite your learners.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Grade">
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="e.g. Year 5"
            className="input-glow"
          />
        </Field>
        <Field label="Subject">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Mathematics"
            className="input-glow"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="What are we learning this term?">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="e.g. Quadratic equations"
            className="input-glow"
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Auto tags:</span>
        {tags.length ? (
          tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-medium text-cyan"
            >
              {t}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground/60">
            EduReach will create suitable tags from the subject and topic.
          </span>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <EduButton
        className="mt-6"
        loading={busy}
        icon={<Plus className="size-4" />}
        onClick={handleCreate}
      >
        Create workspace
      </EduButton>
    </section>
  );
}

function ActiveClassrooms({
  rooms,
  loading,
  sortRecent,
  onToggleSort,
  onOpen,
}: {
  rooms: Classroom[];
  loading: boolean;
  sortRecent: boolean;
  onToggleSort: () => void;
  onOpen: (r: Classroom) => void;
}) {
  return (
    <section className="glass animate-rise rounded-3xl p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-secondary/50 text-cyan">
            <Users className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Active classrooms</h2>
            <p className="text-xs text-muted-foreground">
              Manage ongoing classrooms and track activity.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleSort}
          className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-all hover:border-foreground/25 hover:text-foreground"
        >
          Sort: {sortRecent ? "Recent" : "A–Z"}
        </button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {rooms.map((r, i) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onOpen(r)}
            className={cn(
              "group rounded-2xl border border-border bg-gradient-to-br to-transparent p-4 text-left transition-all hover:border-foreground/25",
              TINTS[i % TINTS.length],
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">{r.name}</h3>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span>{r.learners} learners</span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-mint" />
                {r.status}
              </span>
            </div>
          </button>
        ))}
        {loading && (
          <p className="col-span-full flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading your classrooms…
          </p>
        )}
        {!loading && rooms.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
            No classrooms yet — create one above.
          </p>
        )}
      </div>
    </section>
  );
}

function QuickActions({
  learners,
  drafts,
  onAnnounce,
  onViewAll,
  onLibrary,
  onWorksheet,
}: {
  learners: number;
  drafts: number;
  onAnnounce: () => void;
  onViewAll: () => void;
  onLibrary: () => void;
  onWorksheet: () => void;
}) {
  const items = [
    { label: "Enrolled learners", icon: Users, badge: learners, onClick: onViewAll },
    { label: "AI library", icon: MessageSquare, badge: drafts, onClick: onLibrary },
    { label: "Plan the week", icon: Send, onClick: onAnnounce },
    { label: "New worksheet", icon: FileText, onClick: onWorksheet },
    { label: "View all classrooms", icon: BookOpen, onClick: onViewAll },
  ];
  return (
    <section className="glass animate-rise rounded-3xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="size-4 text-violet" />
        <h2 className="text-sm font-semibold">Quick actions</h2>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={it.onClick}
            className="surface-row flex w-full items-center justify-between px-3 py-2.5 text-sm hover:border-foreground/20"
          >
            <span className="flex items-center gap-2.5">
              <it.icon className="size-4 text-muted-foreground" />
              {it.label}
            </span>
            <span className="flex items-center gap-2">
              {typeof it.badge === "number" && (
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[10px] font-semibold",
                    it.badge > 0 ? "bg-mint/15 text-mint" : "bg-secondary/60 text-muted-foreground",
                  )}
                >
                  {it.badge}
                </span>
              )}
              <ChevronRight className="size-4 text-muted-foreground" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RecentActivity({
  announcements,
  generated,
}: {
  announcements: { id: string; body: string; created_at: string }[];
  generated: Generated[];
}) {
  const feed = [
    ...announcements.map((a) => ({
      id: a.id,
      title: "Announcement sent",
      sub: a.body,
      at: a.created_at,
      kind: "announcement" as const,
    })),
    ...generated.map((g) => ({
      id: g.id,
      title: `AI ${g.kind} created`,
      sub: g.title,
      at: g.created_at,
      kind: "doc" as const,
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 6);

  return (
    <section className="glass animate-rise rounded-3xl p-5">
      <h2 className="mb-4 text-sm font-semibold">Recent activity</h2>
      <div className="space-y-3">
        {feed.map((f) => (
          <div key={f.id} className="flex items-start gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary/50">
              {f.kind === "announcement" ? (
                <Send className="size-4 text-cyan" />
              ) : (
                <BookOpen className="size-4 text-violet" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{f.title}</p>
              <p className="truncate text-xs text-muted-foreground">{f.sub}</p>
            </div>
          </div>
        ))}
        {feed.length === 0 && <p className="text-xs text-muted-foreground">No activity yet.</p>}
      </div>
    </section>
  );
}

function TeacherTip() {
  return (
    <section className="glass animate-rise relative overflow-hidden rounded-3xl p-5">
      <div className="absolute -right-8 -top-8 size-28 rounded-full bg-amber/20 blur-2xl" />
      <div className="relative flex items-center gap-2">
        <Lightbulb className="size-4 text-amber" />
        <h2 className="text-sm font-semibold">Teacher tip</h2>
      </div>
      <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
        Use structured answers to break complex topics into clear, digestible steps for your
        learners.
      </p>
    </section>
  );
}

function AnnouncementWidget({
  onSend,
  busy,
}: {
  onSend: (text: string) => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <section className="glass animate-rise rounded-3xl p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Send className="size-4 text-cyan" /> Quick announcement
      </h2>
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Send a note to your classroom…"
        className="input-glow resize-none"
      />
      <EduButton
        variant="violet"
        className="mt-3 w-full"
        loading={busy}
        disabled={!text.trim()}
        onClick={() => {
          onSend(text.trim());
          setText("");
        }}
      >
        Send announcement
      </EduButton>
    </section>
  );
}

/* ---------------- AI form ---------------- */

export function GenerateForm({
  kind,
  busy,
  withQuestions,
  titleLabel,
  titlePlaceholder,
  onSubmit,
}: {
  kind: "worksheet" | "lesson" | "plan" | "coach";
  busy: boolean;
  withQuestions?: boolean;
  titleLabel: string;
  titlePlaceholder: string;
  onSubmit: (v: {
    kind: "worksheet" | "lesson" | "plan" | "coach";
    title: string;
    subject: string;
    grade: string;
    detail: string;
    questions: number;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [grade, setGrade] = useState("Year 10");
  const [detail, setDetail] = useState("");
  const [questions, setQuestions] = useState(10);

  return (
    <div className="space-y-4">
      <Field label={titleLabel}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholder}
          className="input-glow"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Subject">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input-glow" />
        </Field>
        <Field label="Grade">
          <input value={grade} onChange={(e) => setGrade(e.target.value)} className="input-glow" />
        </Field>
      </div>
      {withQuestions && (
        <Field label="Number of questions">
          <input
            type="number"
            min={1}
            max={40}
            value={questions}
            onChange={(e) => setQuestions(Math.min(40, Math.max(1, Number(e.target.value) || 1)))}
            className="input-glow"
          />
        </Field>
      )}
      <Field label="Anything else to include? (optional)">
        <textarea
          rows={3}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="e.g. mixed difficulty, include a word problem"
          className="input-glow resize-none"
        />
      </Field>
      <EduButton
        className="w-full"
        loading={busy}
        icon={<Sparkles className="size-4" />}
        disabled={!title.trim()}
        onClick={() =>
          onSubmit({ kind, title: title.trim(), subject, grade, detail: detail.trim(), questions })
        }
      >
        {busy ? "EduReach AI is writing…" : "Generate with EduReach AI"}
      </EduButton>
    </div>
  );
}