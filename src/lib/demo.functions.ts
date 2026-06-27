import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const today = new Date();
const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

function makeDoc(name: string, doc_type: string, category: string, extracted: Record<string, any>) {
  return {
    name,
    doc_type,
    category,
    confidence: 0.92,
    size_bytes: 120_000,
    storage_path: `demo/${crypto.randomUUID()}-${name.replace(/\s+/g, "_")}`,
    mime_type: "application/pdf",
    tags: ["demo"],
    extraction_status: "ready",
    extracted: { ...extracted, demo: true },
    extracted_text: extracted.summary ?? extracted.title ?? name,
  };
}

export const loadDemoStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Wipe previous demo data only (rows tagged demo=true) so re-running is safe.
    await supabase.from("documents").delete().contains("tags", ["demo"]);
    await supabase.from("relationships").delete().eq("user_id", userId);
    // For typed records we wipe all of the user's so the demo is coherent.
    await Promise.all([
      supabase.from("skills").delete().eq("user_id", userId),
      supabase.from("projects").delete().eq("user_id", userId),
      supabase.from("certifications").delete().eq("user_id", userId),
      supabase.from("internships").delete().eq("user_id", userId),
      supabase.from("achievements").delete().eq("user_id", userId),
    ]);

    const stamp = (rows: any[]) => rows.map((r) => ({ ...r, user_id: userId }));

    // Skills
    const skills = stamp([
      { name: "Python", level: 88, category: "Language" },
      { name: "Machine Learning", level: 82, category: "AI" },
      { name: "Deep Learning", level: 74, category: "AI" },
      { name: "PyTorch", level: 70, category: "Framework" },
      { name: "TensorFlow", level: 65, category: "Framework" },
      { name: "LangChain", level: 68, category: "Framework" },
      { name: "FastAPI", level: 72, category: "Backend" },
      { name: "React", level: 78, category: "Frontend" },
      { name: "SQL", level: 75, category: "Data" },
      { name: "Docker", level: 60, category: "DevOps" },
      { name: "Git", level: 85, category: "Tools" },
      { name: "Data Visualization", level: 70, category: "Data" },
    ]);

    // Certifications
    const certs = stamp([
      { name: "Python for Everybody", issuer: "Coursera / University of Michigan", credential_id: "PY-2023-7741", issued_at: iso(2023, 6, 14) },
      { name: "Machine Learning Specialization", issuer: "DeepLearning.AI / Stanford", credential_id: "ML-2024-2210", issued_at: iso(2024, 3, 22) },
    ]);

    // Internships
    const internships = stamp([
      {
        company: "Neuralabs AI",
        role: "AI Engineering Intern",
        description: "Built retrieval-augmented chat features using LangChain, OpenAI, and FastAPI. Deployed a vector search service handling 50k+ docs.",
        start_date: iso(2025, 5, 1),
        end_date: iso(2025, 8, 15),
      },
    ]);

    // Projects
    const projects = stamp([
      {
        title: "AI Chatbot for Campus Support",
        description: "Conversational assistant that answers student queries from university handbooks. Uses RAG with LangChain, OpenAI embeddings and FastAPI.",
        tech: ["Python", "LangChain", "FastAPI", "React"],
        start_date: iso(2024, 10, 1),
        end_date: iso(2025, 1, 20),
      },
      {
        title: "Handwritten Digit Recognizer",
        description: "CNN trained on MNIST achieving 99.1% test accuracy. Includes a React demo that classifies user-drawn digits in the browser.",
        tech: ["Python", "PyTorch", "React"],
        start_date: iso(2024, 4, 5),
        end_date: iso(2024, 6, 1),
      },
      {
        title: "Movie Recommendation Engine",
        description: "Hybrid recommender combining collaborative filtering and content embeddings on the MovieLens dataset. Served via FastAPI.",
        tech: ["Python", "TensorFlow", "FastAPI", "SQL"],
        start_date: iso(2025, 2, 10),
        end_date: iso(2025, 4, 20),
      },
    ]);

    // Achievements
    const achievements = stamp([
      { title: "1st Place — University Hackathon (AI Track)", description: "Won the AI track for the Campus Support chatbot.", awarded_at: iso(2025, 2, 15) },
      { title: "Dean's List", description: "Top 5% of the Computer Science cohort.", awarded_at: iso(2024, 12, 20) },
      { title: "Kaggle Bronze Medal", description: "Top 10% finish in tabular classification competition.", awarded_at: iso(2024, 9, 3) },
    ]);

    // Documents (with extracted metadata so AI search & graph have substance)
    const documents = stamp([
      makeDoc("Alex_Carter_Resume.pdf", "Resume", "Academics", {
        documentType: "Resume",
        title: "Alex Carter — Computer Science Resume",
        organization: "State University",
        date: iso(2026, 1, 5),
        summary: "Final-year CS student focused on AI engineering. Internship at Neuralabs AI, three ML projects, Python + ML certifications.",
        skills: ["Python", "Machine Learning", "PyTorch", "LangChain", "FastAPI", "React"],
        projects: ["AI Chatbot for Campus Support", "Handwritten Digit Recognizer", "Movie Recommendation Engine"],
      }),
      makeDoc("Python_for_Everybody_Certificate.pdf", "Certificate", "Certifications", {
        documentType: "Certificate",
        title: "Python for Everybody",
        organization: "Coursera / University of Michigan",
        date: iso(2023, 6, 14),
        certifications: ["Python for Everybody"],
        skills: ["Python"],
        summary: "Verified completion of the Python for Everybody specialization.",
      }),
      makeDoc("ML_Specialization_Certificate.pdf", "Certificate", "Certifications", {
        documentType: "Certificate",
        title: "Machine Learning Specialization",
        organization: "DeepLearning.AI / Stanford",
        date: iso(2024, 3, 22),
        certifications: ["Machine Learning Specialization"],
        skills: ["Machine Learning", "Deep Learning", "TensorFlow"],
        summary: "Three-course specialization covering supervised, unsupervised and recommender systems.",
      }),
      makeDoc("Neuralabs_AI_Internship_Offer.pdf", "Offer Letter", "Internships", {
        documentType: "Internship Offer",
        title: "AI Engineering Intern — Neuralabs AI",
        organization: "Neuralabs AI",
        date: iso(2025, 4, 12),
        internships: ["AI Engineering Intern @ Neuralabs AI"],
        skills: ["Python", "LangChain", "FastAPI"],
        summary: "Offer for summer 2025 AI engineering internship.",
      }),
      makeDoc("Campus_Chatbot_Report.pdf", "Project Report", "Projects", {
        documentType: "Project Report",
        title: "AI Chatbot for Campus Support",
        date: iso(2025, 1, 25),
        projects: ["AI Chatbot for Campus Support"],
        technologies: ["Python", "LangChain", "FastAPI", "React"],
        skills: ["Python", "LangChain", "FastAPI"],
        summary: "Final report covering architecture, evaluation and deployment of the RAG chatbot.",
      }),
      makeDoc("Digit_Recognizer_Notes.pdf", "Project Report", "Projects", {
        documentType: "Project Report",
        title: "Handwritten Digit Recognizer",
        date: iso(2024, 6, 4),
        projects: ["Handwritten Digit Recognizer"],
        technologies: ["Python", "PyTorch", "React"],
        skills: ["PyTorch", "Deep Learning"],
        summary: "Design notes and metrics for the MNIST CNN classifier and browser demo.",
      }),
      makeDoc("Movie_Recommender_Whitepaper.pdf", "Project Report", "Projects", {
        documentType: "Project Report",
        title: "Movie Recommendation Engine",
        date: iso(2025, 4, 22),
        projects: ["Movie Recommendation Engine"],
        technologies: ["Python", "TensorFlow", "FastAPI", "SQL"],
        skills: ["Machine Learning", "SQL", "TensorFlow"],
        summary: "Hybrid recommender combining collaborative filtering and content embeddings.",
      }),
      makeDoc("Hackathon_Winner_Certificate.pdf", "Certificate", "Achievements", {
        documentType: "Award",
        title: "1st Place — University Hackathon (AI Track)",
        date: iso(2025, 2, 15),
        achievements: ["1st Place — University Hackathon (AI Track)"],
        summary: "Awarded first place in the AI track for the Campus Support chatbot.",
      }),
      makeDoc("Transcript_Fall_2025.pdf", "Transcript", "Academics", {
        documentType: "Transcript",
        title: "Official Transcript — Fall 2025",
        organization: "State University",
        date: iso(2025, 12, 18),
        summary: "GPA 3.92 / 4.0. Coursework includes Machine Learning, Deep Learning, Distributed Systems, and Databases.",
      }),
    ]);

    const ins = async (table: string, rows: any[]) => {
      if (!rows.length) return;
      const { error } = await supabase.from(table as any).insert(rows);
      if (error) {
        console.error(`[demo] insert ${table} failed`, error);
        throw new Error(`Failed to seed ${table}.`);
      }
    };

    await Promise.all([
      ins("skills", skills),
      ins("certifications", certs),
      ins("internships", internships),
      ins("projects", projects),
      ins("achievements", achievements),
      ins("documents", documents),
    ]);

    return {
      ok: true,
      counts: {
        skills: skills.length,
        certifications: certs.length,
        internships: internships.length,
        projects: projects.length,
        achievements: achievements.length,
        documents: documents.length,
      },
    };
  });