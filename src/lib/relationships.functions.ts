import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM = `You are a career graph engine for a student digital identity system.
Given the user's certifications, skills, projects, and internships, infer meaningful directional connections.

Only emit edges in these directions:
- Certification -> Skill (a certification validates a skill)
- Skill -> Project (a skill is used in a project)
- Project -> Internship (a project helped obtain an internship)
- Internship -> CareerGoal (an internship advances a career goal)

For CareerGoal targets, invent a short career goal name like "AI Engineer", "Full-stack Developer", "Data Scientist".
Use ONLY the provided item names verbatim for the non-goal nodes.
Return strict JSON: { "edges": [ { "sourceType","sourceName","targetType","targetName","label","confidence" } ] }.
confidence is 0..1. Be conservative — skip weak guesses. Max 30 edges.`;

type Row = { id: string; name: string };

export const rebuildRelationships = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const [certs, skills, projects, internships] = await Promise.all([
      supabase.from("certifications").select("id, name"),
      supabase.from("skills").select("id, name"),
      supabase.from("projects").select("id, title"),
      supabase.from("internships").select("id, company, role"),
    ]);

    const certRows: Row[] = (certs.data ?? []).map((r: any) => ({ id: r.id, name: r.name }));
    const skillRows: Row[] = (skills.data ?? []).map((r: any) => ({ id: r.id, name: r.name }));
    const projRows: Row[] = (projects.data ?? []).map((r: any) => ({ id: r.id, name: r.title }));
    const intRows: Row[] = (internships.data ?? []).map((r: any) => ({
      id: r.id,
      name: `${r.role} @ ${r.company}`,
    }));

    if (!certRows.length && !skillRows.length && !projRows.length && !intRows.length) {
      return { ok: true, edges: 0, message: "No data to analyze yet." };
    }

    const payload = {
      certifications: certRows.map((r) => r.name),
      skills: skillRows.map((r) => r.name),
      projects: projRows.map((r) => r.name),
      internships: intRows.map((r) => r.name),
    };

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Discover relationships from this data:\n${JSON.stringify(payload, null, 2)}` },
      ],
      response_format: { type: "json_object" },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("[rebuildRelationships] AI gateway error", resp.status, t);
      if (resp.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
      throw new Error("Failed to rebuild relationships. Please try again.");
    }

    const json = await resp.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(json?.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = { edges: [] };
    }
    const edges: any[] = Array.isArray(parsed.edges) ? parsed.edges : [];

    const findId = (type: string, name: string): string | null => {
      const n = name?.toLowerCase().trim();
      if (!n) return null;
      const list =
        type === "Certification" ? certRows :
        type === "Skill" ? skillRows :
        type === "Project" ? projRows :
        type === "Internship" ? intRows : [];
      return list.find((r) => r.name.toLowerCase().trim() === n)?.id ?? null;
    };

    // Clear AI-generated edges for this user to avoid duplicates on rebuild
    await supabase.from("relationships").delete().eq("user_id", userId);

    const allowed = new Set([
      "Certification->Skill",
      "Skill->Project",
      "Project->Internship",
      "Internship->CareerGoal",
    ]);

    const rows = edges
      .filter((e) => allowed.has(`${e.sourceType}->${e.targetType}`))
      .map((e) => ({
        user_id: userId,
        source_type: e.sourceType,
        source_id: findId(e.sourceType, e.sourceName),
        target_type: e.targetType,
        target_id: e.targetType === "CareerGoal" ? null : findId(e.targetType, e.targetName),
        label: `${e.sourceName} → ${e.targetName}${e.label ? ` · ${e.label}` : ""}`,
        confidence: typeof e.confidence === "number" ? Math.max(0, Math.min(1, e.confidence)) : 0.7,
      }));

    if (rows.length) {
      const { error } = await supabase.from("relationships").insert(rows);
      if (error) {
        console.error("[rebuildRelationships] insert failed", error);
        throw new Error("Failed to save discovered relationships.");
      }
    }

    return { ok: true, edges: rows.length };
  });