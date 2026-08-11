import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ---------------- classrooms ---------------- */

export const listClassrooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("classrooms")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const CreateClassroom = z.object({
  name: z.string().min(1).max(120),
  subject: z.string().max(80).default(""),
  grade: z.string().max(80).default(""),
  topic: z.string().max(200).default(""),
});

export const createClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateClassroom.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("classrooms")
      .insert({ ...data, user_id: context.userId, status: "Active" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        learners: z.number().int().min(0).max(9999).optional(),
        status: z.string().max(60).optional(),
        topic: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const update: { learners?: number; status?: string; topic?: string } = {};
    if (patch.learners !== undefined) update.learners = patch.learners;
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.topic !== undefined) update.topic = patch.topic;
    const { data: row, error } = await context.supabase
      .from("classrooms")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("classrooms").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- announcements ---------------- */

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        body: z.string().min(1).max(1000),
        classroom_id: z.string().uuid().nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("announcements")
      .insert({ ...data, user_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ---------------- tasks ---------------- */

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        label: z.string().min(1).max(240),
        priority: z.enum(["High", "Med", "Low"]).default("Med"),
        due_date: z.string().nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tasks")
      .insert({ ...data, user_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const toggleTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), done: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tasks")
      .update({ done: data.done })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- AI generated content ---------------- */

export const listGenerated = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("generated_content")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const GenerateInput = z.object({
  kind: z.enum(["worksheet", "lesson", "plan", "coach"]),
  title: z.string().min(1).max(160),
  subject: z.string().max(80).default(""),
  grade: z.string().max(80).default(""),
  detail: z.string().max(600).default(""),
  questions: z.number().int().min(1).max(40).default(10),
});

export type GenerateContentInput = z.input<typeof GenerateInput>;

const PROMPTS: Record<z.infer<typeof GenerateInput>["kind"], (i: z.infer<typeof GenerateInput>) => string> = {
  worksheet: (i) =>
    `Create a classroom worksheet titled "${i.title}" for ${i.grade || "secondary school"} ${i.subject || "students"}. Include exactly ${i.questions} numbered questions of increasing difficulty, then an "Answer key" section. Extra context: ${i.detail || "none"}.`,
  lesson: (i) =>
    `Write a structured lesson plan titled "${i.title}" for ${i.grade || "secondary school"} ${i.subject || "students"}. Include: learning objectives, a 5-minute hook, main teaching sequence with timings, a guided practice activity, an exit-ticket check for understanding, and differentiation notes. Extra context: ${i.detail || "none"}.`,
  plan: (i) =>
    `Draft a realistic weekly study/teaching plan titled "${i.title}". Give Monday to Friday, each with a focused session, a short task and an estimated duration. Keep it achievable. Extra context: ${i.detail || "none"}.`,
  coach: (i) =>
    `Act as a friendly study coach. The student says: "${i.detail || i.title}". Reply with a short encouraging paragraph, then 3-5 concrete, time-boxed next steps as a numbered list.`,
};

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured for this project yet.");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { streamText } = await import("ai");

    const gateway = createLovableAiGatewayProvider(key);

    let text: string;
    try {
      const result = streamText({
        model: gateway("google/gemini-3.6-flash"),
        system:
          "You are EduReach, an assistant for teachers and students. Reply in clear, well-structured markdown. Be concise, practical and age-appropriate. Never invent student data.",
        prompt: PROMPTS[data.kind](data),
      });
      text = await result.text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("429")) throw new Error("AI is busy right now — please try again in a moment.");
      if (message.includes("402")) throw new Error("AI credits are exhausted for this workspace.");
      throw new Error(`AI request failed: ${message}`);
    }

    const { data: row, error } = await context.supabase
      .from("generated_content")
      .insert({
        user_id: context.userId,
        kind: data.kind,
        title: data.title,
        prompt: PROMPTS[data.kind](data).slice(0, 2000),
        content: text,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });