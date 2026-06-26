import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ documentId: z.string().uuid() });

const MAX_EXTRACT_BYTES = 25 * 1024 * 1024; // 25 MB

const SYSTEM = `You are an expert resume/credential parser for a student digital identity system.
Given a document (resume, certificate, internship letter, project report, transcript, etc.), extract structured metadata.
Return STRICT JSON matching the provided schema. Use null or empty arrays when unknown. Dates as YYYY-MM-DD when possible.
documentType must be one of: Resume, Certificate, Internship, Project, Transcript, Letter, Achievement, Other.
You MUST also classify the document into exactly ONE category from this fixed taxonomy:
Projects, Skills, Certifications, Internships, Achievements, Academics.
Return the chosen category in "category" and a confidence score between 0 and 1 in "confidence".
Never refuse to categorize — pick the closest category.`;

const SCHEMA = {
  type: "object",
  properties: {
    documentType: { type: "string" },
    category: { type: "string", enum: ["Projects", "Skills", "Certifications", "Internships", "Achievements", "Academics"] },
    confidence: { type: "number" },
    title: { type: "string" },
    organization: { type: "string" },
    date: { type: "string" },
    summary: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    technologies: { type: "array", items: { type: "string" } },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          tech: { type: "array", items: { type: "string" } },
        },
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          issued_at: { type: "string" },
        },
      },
    },
    internships: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          role: { type: "string" },
          start_date: { type: "string" },
          end_date: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    achievements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          awarded_at: { type: "string" },
        },
      },
    },
    extractedText: { type: "string" },
  },
  required: ["documentType"],
} as const;

function isImage(mime: string | null | undefined) {
  return !!mime && mime.startsWith("image/");
}
function isPdf(mime: string | null | undefined, name: string) {
  return mime === "application/pdf" || name.toLowerCase().endsWith(".pdf");
}

async function fileToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.byteLength; i++) bin += String.fromCharCode(buf[i]);
  // btoa exists in Workers runtime
  return btoa(bin);
}

export const extractDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, name, mime_type, storage_path, user_id")
      .eq("id", data.documentId)
      .maybeSingle();
    if (docErr || !doc) {
      if (docErr) console.error("[extractDocument] document lookup failed", docErr);
      throw new Error("Document not found.");
    }

    const { data: file, error: dlErr } = await supabase.storage
      .from("documents")
      .download(doc.storage_path);
    if (dlErr || !file) {
      if (dlErr) console.error("[extractDocument] download failed", dlErr);
      throw new Error("Could not download the uploaded file.");
    }

    if (file.size > MAX_EXTRACT_BYTES) {
      await supabase
        .from("documents")
        .update({ extraction_status: "failed" })
        .eq("id", doc.id);
      throw new Error("File exceeds the 25 MB limit.");
    }

    // Build user content
    const userContent: any[] = [
      { type: "text", text: `Extract structured metadata from this document (filename: ${doc.name}). Respond with JSON only, matching the schema.` },
    ];

    const mime = doc.mime_type || file.type || "application/octet-stream";
    if (isImage(mime)) {
      const b64 = await fileToBase64(file);
      userContent.push({ type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } });
    } else if (isPdf(mime, doc.name)) {
      const b64 = await fileToBase64(file);
      userContent.push({
        type: "file",
        file: { filename: doc.name, file_data: `data:application/pdf;base64,${b64}` },
      });
    } else {
      // Try as text
      const text = await file.text().catch(() => "");
      userContent[0] = {
        type: "text",
        text: `Extract structured metadata from this document (filename: ${doc.name}).\n\n---\n${text.slice(0, 60000)}\n---\n\nRespond with JSON only.`,
      };
    }

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "document_metadata", strict: false, schema: SCHEMA },
      },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[extractDocument] AI gateway error", resp.status, errText);
      await supabase
        .from("documents")
        .update({ extraction_status: "failed" })
        .eq("id", doc.id);
      if (resp.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
      throw new Error("Failed to process document. Please try again.");
    }

    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    let extracted: any = {};
    try {
      extracted = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      extracted = { raw: String(raw).slice(0, 2000) };
    }

    const tags = [
      ...(extracted.skills ?? []).slice(0, 5),
      ...(extracted.technologies ?? []).slice(0, 3),
    ].filter(Boolean);

    const docType = extracted.documentType || "Other";

    const ALLOWED = ["Projects", "Skills", "Certifications", "Internships", "Achievements", "Academics"];
    let category: string = ALLOWED.includes(extracted.category) ? extracted.category : "";
    if (!category) {
      const map: Record<string, string> = {
        Resume: "Skills", Certificate: "Certifications", Internship: "Internships",
        Project: "Projects", Transcript: "Academics", Letter: "Internships",
        Achievement: "Achievements", Other: "Skills",
      };
      category = map[docType] ?? "Skills";
    }
    let confidence = typeof extracted.confidence === "number" ? extracted.confidence : 0.7;
    if (confidence > 1) confidence = confidence / 100;
    confidence = Math.max(0, Math.min(1, confidence));

    await supabase
      .from("documents")
      .update({
        doc_type: docType,
        category,
        confidence,
        tags,
        extracted,
        extracted_text: typeof extracted.extractedText === "string" ? extracted.extractedText : null,
        extraction_status: "done",
      })
      .eq("id", doc.id);

    // Fan out into normalized tables (best effort, ignore errors per row)
    const skillRows = (extracted.skills ?? []).map((name: string) => ({
      user_id: userId, name, level: 60, category: "AI-extracted",
    }));
    if (skillRows.length) await supabase.from("skills").insert(skillRows);

    const certRows = (extracted.certifications ?? []).map((c: any) => ({
      user_id: userId,
      name: c?.name ?? doc.name,
      issuer: c?.issuer ?? extracted.organization ?? null,
      issued_at: c?.issued_at ?? extracted.date ?? null,
    }));
    if (certRows.length) await supabase.from("certifications").insert(certRows);

    const internRows = (extracted.internships ?? []).map((i: any) => ({
      user_id: userId,
      company: i?.company ?? extracted.organization ?? "Unknown",
      role: i?.role ?? "Intern",
      start_date: i?.start_date ?? null,
      end_date: i?.end_date ?? null,
      description: i?.description ?? null,
    }));
    if (internRows.length) await supabase.from("internships").insert(internRows);

    const projRows = (extracted.projects ?? []).map((p: any) => ({
      user_id: userId,
      title: p?.title ?? "Untitled project",
      description: p?.description ?? null,
      tech: Array.isArray(p?.tech) ? p.tech : [],
    }));
    if (projRows.length) await supabase.from("projects").insert(projRows);

    const achRows = (extracted.achievements ?? []).map((a: any) => ({
      user_id: userId,
      title: a?.title ?? "Achievement",
      description: a?.description ?? null,
      awarded_at: a?.awarded_at ?? null,
    }));
    if (achRows.length) await supabase.from("achievements").insert(achRows);

    return { ok: true, extracted, docType, tags, category, confidence };
  });