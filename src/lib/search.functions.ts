import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Msg = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const Input = z.object({
  query: z.string().min(1).max(500),
  history: z.array(Msg).max(20).default([]),
});

const SYSTEM = `You are IdentityOS Search — a conversational assistant for a student's digital identity vault.
You answer natural-language questions about the user's uploaded documents, skills, projects, certifications, internships, and achievements.

You will be given a JSON "index" of the user's data with stable IDs. Use ONLY this index to answer — never invent items.

Return STRICT JSON of shape:
{
  "answer": "<concise, friendly markdown answer in 1–4 sentences>",
  "documentIds": ["<doc.id>", ...],   // matching documents from index.documents, most relevant first, max 8
  "skillIds": ["<skill.id>", ...],     // matching skills if the user asked about skills, max 12
  "certificationIds": [...],            // when relevant
  "projectIds": [...],
  "internshipIds": [...],
  "achievementIds": [...]
}

Rules:
- Be semantic: "AI projects" matches projects whose title/description/tech includes ML, machine learning, neural, LLM, NLP, vision, etc.
- "Latest resume" → the most recently created document where doc_type or extracted.documentType is Resume.
- "What skills do I have?" → list skill names from index.skills; put their IDs in skillIds and leave documentIds empty.
- If nothing matches, set answer to a friendly "I couldn't find …" and return empty arrays.
- Never include IDs that aren't in the provided index.
- Keep the answer short. Do not list every document in prose — the UI renders them as cards.`;

export const aiSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured.");

    const [docs, skills, certs, projs, ints, achs] = await Promise.all([
      supabase
        .from("documents")
        .select("id, name, doc_type, category, tags, created_at, extracted")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("skills").select("id, name, level, category").limit(200),
      supabase.from("certifications").select("id, name, issuer, issued_at").limit(100),
      supabase.from("projects").select("id, title, description, tech, start_date, end_date").limit(100),
      supabase
        .from("internships")
        .select("id, company, role, description, start_date, end_date")
        .limit(100),
      supabase.from("achievements").select("id, title, description, awarded_at").limit(100),
    ]);

    // Build a compact index — strip long text fields.
    const index = {
      documents: (docs.data ?? []).map((d: any) => ({
        id: d.id,
        name: d.name,
        doc_type: d.doc_type,
        category: d.category,
        tags: d.tags ?? [],
        created_at: d.created_at,
        title: d.extracted?.title ?? null,
        organization: d.extracted?.organization ?? null,
        date: d.extracted?.date ?? null,
        summary: typeof d.extracted?.summary === "string" ? d.extracted.summary.slice(0, 240) : null,
        skills: d.extracted?.skills ?? [],
        technologies: d.extracted?.technologies ?? [],
      })),
      skills: (skills.data ?? []).map((s: any) => ({ id: s.id, name: s.name, level: s.level, category: s.category })),
      certifications: (certs.data ?? []).map((c: any) => ({ id: c.id, name: c.name, issuer: c.issuer, issued_at: c.issued_at })),
      projects: (projs.data ?? []).map((p: any) => ({
        id: p.id, title: p.title,
        description: typeof p.description === "string" ? p.description.slice(0, 240) : null,
        tech: p.tech ?? [], start_date: p.start_date, end_date: p.end_date,
      })),
      internships: (ints.data ?? []).map((i: any) => ({
        id: i.id, company: i.company, role: i.role,
        description: typeof i.description === "string" ? i.description.slice(0, 240) : null,
        start_date: i.start_date, end_date: i.end_date,
      })),
      achievements: (achs.data ?? []).map((a: any) => ({
        id: a.id, title: a.title,
        description: typeof a.description === "string" ? a.description.slice(0, 240) : null,
        awarded_at: a.awarded_at,
      })),
    };

    const empty = !index.documents.length && !index.skills.length && !index.certifications.length
      && !index.projects.length && !index.internships.length && !index.achievements.length;
    if (empty) {
      return {
        answer: "Your identity vault is empty. Upload a few documents and I'll be able to answer questions about them.",
        documentIds: [], skillIds: [], certificationIds: [],
        projectIds: [], internshipIds: [], achievementIds: [],
      };
    }

    const messages = [
      { role: "system", content: SYSTEM },
      ...data.history.map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: `User question: ${data.query}\n\nINDEX (JSON):\n${JSON.stringify(index)}`,
      },
    ];

    const body = {
      model: "google/gemini-2.5-flash",
      messages,
      response_format: { type: "json_object" as const },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("[aiSearch] AI gateway error", resp.status, t);
      if (resp.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
      throw new Error("Search failed. Please try again.");
    }

    const json = await resp.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(json?.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }

    const validIds = {
      documents: new Set(index.documents.map((d) => d.id)),
      skills: new Set(index.skills.map((s) => s.id)),
      certifications: new Set(index.certifications.map((c) => c.id)),
      projects: new Set(index.projects.map((p) => p.id)),
      internships: new Set(index.internships.map((i) => i.id)),
      achievements: new Set(index.achievements.map((a) => a.id)),
    };
    const filt = (arr: any, set: Set<string>, max: number) =>
      Array.isArray(arr) ? arr.filter((x: any) => typeof x === "string" && set.has(x)).slice(0, max) : [];

    return {
      answer: typeof parsed.answer === "string" && parsed.answer.trim()
        ? parsed.answer
        : "I couldn't find anything matching that.",
      documentIds: filt(parsed.documentIds, validIds.documents, 8),
      skillIds: filt(parsed.skillIds, validIds.skills, 20),
      certificationIds: filt(parsed.certificationIds, validIds.certifications, 12),
      projectIds: filt(parsed.projectIds, validIds.projects, 12),
      internshipIds: filt(parsed.internshipIds, validIds.internships, 12),
      achievementIds: filt(parsed.achievementIds, validIds.achievements, 12),
    };
  });
