import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  role: z.string().min(2).max(120),
});

const SYSTEM = `You are IdentityOS Career Copilot — an honest, encouraging career coach for students.
You receive a target role and a JSON inventory of the user's current skills, projects, certifications, and internships.

Return STRICT JSON of shape:
{
  "summary": "<2-3 sentence honest assessment of fit for the target role>",
  "readiness": <integer 0-100, overall readiness for the role>,
  "strengths": [{ "title": "<short>", "detail": "<1 sentence why this is a strength for the role>", "evidence": "<name of skill/project/cert/internship from inventory>" }],
  "missingSkills": [{ "name": "<skill>", "priority": "high"|"medium"|"low", "why": "<1 short sentence>" }],
  "nextSteps": [{ "title": "<actionable step>", "detail": "<1 short sentence>", "timeframe": "<e.g. '2 weeks' | '1 month' | '3 months'>" }],
  "suggestedCertifications": [{ "name": "<cert>", "provider": "<provider>", "why": "<short>" }],
  "suggestedProjects": [{ "title": "<project idea>", "description": "<1-2 sentences>", "skills": ["<skill>", ...] }],
  "roadmap": [{ "phase": "Now"|"Next"|"Later", "title": "<milestone>", "items": ["<bullet>", ...] }]
}

Rules:
- Be specific to the inventory. Cite real skills/projects in "evidence" when listing strengths.
- 3-6 strengths, 4-8 missing skills, 4-6 next steps, 2-4 certifications, 2-4 projects.
- The roadmap MUST contain exactly three phases in order: Now, Next, Later (3-5 items each).
- If inventory is empty, still produce a useful starter roadmap for the target role.
- Never invent items the user already has. Be encouraging but realistic.`;

export const careerCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured.");

    const [skills, certs, projs, ints] = await Promise.all([
      supabase.from("skills").select("name, level, category").limit(200),
      supabase.from("certifications").select("name, issuer, issued_at").limit(100),
      supabase.from("projects").select("title, description, tech").limit(100),
      supabase.from("internships").select("company, role, description, start_date, end_date").limit(100),
    ]);

    const inventory = {
      skills: (skills.data ?? []).map((s: any) => ({ name: s.name, level: s.level, category: s.category })),
      certifications: (certs.data ?? []).map((c: any) => ({ name: c.name, issuer: c.issuer, issued_at: c.issued_at })),
      projects: (projs.data ?? []).map((p: any) => ({
        title: p.title,
        description: typeof p.description === "string" ? p.description.slice(0, 240) : null,
        tech: p.tech ?? [],
      })),
      internships: (ints.data ?? []).map((i: any) => ({
        company: i.company, role: i.role,
        description: typeof i.description === "string" ? i.description.slice(0, 240) : null,
        start_date: i.start_date, end_date: i.end_date,
      })),
    };

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Target role: ${data.role}\n\nINVENTORY (JSON):\n${JSON.stringify(inventory)}`,
        },
      ],
      response_format: { type: "json_object" as const },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("[careerCopilot] AI gateway error", resp.status, t);
      if (resp.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
      throw new Error("Career analysis failed. Please try again.");
    }

    const json = await resp.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(json?.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }

    const arr = (v: any) => (Array.isArray(v) ? v : []);
    return {
      role: data.role,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      readiness: Math.max(0, Math.min(100, Number(parsed.readiness) || 0)),
      strengths: arr(parsed.strengths).slice(0, 8),
      missingSkills: arr(parsed.missingSkills).slice(0, 10),
      nextSteps: arr(parsed.nextSteps).slice(0, 8),
      suggestedCertifications: arr(parsed.suggestedCertifications).slice(0, 6),
      suggestedProjects: arr(parsed.suggestedProjects).slice(0, 6),
      roadmap: arr(parsed.roadmap).slice(0, 3),
      inventoryCounts: {
        skills: inventory.skills.length,
        certifications: inventory.certifications.length,
        projects: inventory.projects.length,
        internships: inventory.internships.length,
      },
    };
  });