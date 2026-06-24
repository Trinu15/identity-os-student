import {
  FileText,
  Award,
  Briefcase,
  Sparkles,
  GraduationCap,
  Code2,
  Trophy,
  Building2,
} from "lucide-react";

export const profile = {
  name: "Aarav Mehta",
  email: "aarav.mehta@university.edu",
  studentId: "STU-2024-08912",
  university: "Indian Institute of Technology, Bombay",
  program: "B.Tech Computer Science, Year 3",
  bio: "Builder, researcher, and lifelong learner. Interested in distributed systems, ML infra, and student-led product design.",
  avatar: "https://api.dicebear.com/9.x/glass/svg?seed=aarav&backgroundType=gradientLinear",
  joined: "Sep 2023",
};

export const stats = [
  { key: "documents", label: "Total Documents", value: 47, delta: "+6 this month", icon: FileText, tone: "primary" },
  { key: "skills", label: "Skills Identified", value: 38, delta: "+4 new", icon: Sparkles, tone: "accent" },
  { key: "certifications", label: "Certifications", value: 12, delta: "+2 this quarter", icon: Award, tone: "chart-3" },
  { key: "projects", label: "Projects", value: 9, delta: "3 in progress", icon: Code2, tone: "chart-4" },
  { key: "internships", label: "Internships", value: 3, delta: "1 active", icon: Briefcase, tone: "chart-5" },
  { key: "achievements", label: "Achievements", value: 7, delta: "+1 award", icon: Trophy, tone: "primary" },
] as const;

export type Doc = {
  id: string;
  name: string;
  type: "Certificate" | "Resume" | "Transcript" | "Project" | "Letter" | "Other";
  size: string;
  uploaded: string;
  tags: string[];
};

export const recentUploads: Doc[] = [
  { id: "d1", name: "AWS Cloud Practitioner.pdf", type: "Certificate", size: "1.2 MB", uploaded: "2 hours ago", tags: ["AWS", "Cloud"] },
  { id: "d2", name: "Summer Internship Letter — Stripe.pdf", type: "Letter", size: "340 KB", uploaded: "Yesterday", tags: ["Internship", "Stripe"] },
  { id: "d3", name: "Distributed Systems Project Report.pdf", type: "Project", size: "3.4 MB", uploaded: "2 days ago", tags: ["Research", "Go"] },
  { id: "d4", name: "Semester 5 Transcript.pdf", type: "Transcript", size: "210 KB", uploaded: "1 week ago", tags: ["Academic"] },
  { id: "d5", name: "Hackathon Winner — Nova 2025.png", type: "Certificate", size: "880 KB", uploaded: "2 weeks ago", tags: ["Hackathon", "Award"] },
  { id: "d6", name: "Resume — Nov 2025.pdf", type: "Resume", size: "420 KB", uploaded: "3 weeks ago", tags: ["CV"] },
];

export const skills = [
  { name: "TypeScript", level: 92, category: "Languages" },
  { name: "Python", level: 88, category: "Languages" },
  { name: "Go", level: 74, category: "Languages" },
  { name: "React", level: 90, category: "Frameworks" },
  { name: "PostgreSQL", level: 80, category: "Data" },
  { name: "Kubernetes", level: 65, category: "Infra" },
  { name: "Machine Learning", level: 72, category: "AI" },
  { name: "System Design", level: 78, category: "Engineering" },
];

export type TimelineItem = {
  id: string;
  date: string;
  title: string;
  org: string;
  type: "education" | "internship" | "project" | "certification" | "award";
  description: string;
};

export const timeline: TimelineItem[] = [
  { id: "t1", date: "Nov 2025", title: "AWS Cloud Practitioner", org: "Amazon Web Services", type: "certification", description: "Foundational cloud certification, scored 912/1000." },
  { id: "t2", date: "Jun 2025", title: "Software Engineering Intern", org: "Stripe", type: "internship", description: "Shipped a usage-metering pipeline handling 12M events/day on the Billing team." },
  { id: "t3", date: "Apr 2025", title: "Winner — Nova Hackathon", org: "IIT Bombay", type: "award", description: "Built a real-time accessibility overlay for lecture videos. 1st of 240 teams." },
  { id: "t4", date: "Jan 2025", title: "Research Project: Raft Consensus", org: "Distributed Systems Lab", type: "project", description: "Implemented and benchmarked a Raft variant with leader-leases in Go." },
  { id: "t5", date: "Aug 2024", title: "B.Tech Computer Science, Year 3", org: "IIT Bombay", type: "education", description: "GPA 9.2 / 10. Electives in ML, compilers, and networks." },
  { id: "t6", date: "May 2024", title: "Google Summer of Code", org: "CNCF / OpenTelemetry", type: "internship", description: "Contributed a trace-context propagator for Rust SDK." },
  { id: "t7", date: "Dec 2023", title: "Meta Frontend Certificate", org: "Coursera", type: "certification", description: "9-course specialization, completed with distinction." },
];

export const graphNodes = [
  { id: "you", label: "You", group: "self", icon: GraduationCap },
  { id: "iit", label: "IIT Bombay", group: "education", icon: Building2 },
  { id: "stripe", label: "Stripe", group: "work", icon: Briefcase },
  { id: "gsoc", label: "GSoC / CNCF", group: "work", icon: Briefcase },
  { id: "raft", label: "Raft Project", group: "project", icon: Code2 },
  { id: "nova", label: "Nova Hackathon", group: "award", icon: Trophy },
  { id: "aws", label: "AWS Cert", group: "cert", icon: Award },
  { id: "ts", label: "TypeScript", group: "skill", icon: Sparkles },
  { id: "go", label: "Go", group: "skill", icon: Sparkles },
  { id: "ml", label: "Machine Learning", group: "skill", icon: Sparkles },
];

export const graphEdges: Array<[string, string]> = [
  ["you", "iit"], ["you", "stripe"], ["you", "gsoc"], ["you", "raft"],
  ["you", "nova"], ["you", "aws"], ["you", "ts"], ["you", "go"], ["you", "ml"],
  ["stripe", "ts"], ["gsoc", "go"], ["raft", "go"], ["iit", "ml"], ["nova", "ts"],
];

export const aiSuggestions = [
  "What skills did I gain at Stripe?",
  "List all my cloud certifications",
  "Summarize my research projects",
  "Which documents mention Kubernetes?",
  "Show internships in 2025",
];

export const documentTrend = [
  { month: "Jun", uploads: 3 }, { month: "Jul", uploads: 5 },
  { month: "Aug", uploads: 4 }, { month: "Sep", uploads: 8 },
  { month: "Oct", uploads: 6 }, { month: "Nov", uploads: 9 },
];
