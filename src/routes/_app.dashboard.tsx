import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, FileText, Sparkles, TrendingUp, Award, Briefcase, Code2, Trophy } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { documentTrend, skills as fallbackSkills } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — IdentityOS" },
      { name: "description", content: "Your AI-curated overview of documents, skills, certifications, projects, and internships." },
    ],
  }),
  component: Dashboard,
});

type DocRow = { id: string; name: string; doc_type: string; size_bytes: number; tags: string[]; created_at: string };
type SkillRow = { name: string; level: number };

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function Dashboard() {
  const [name, setName] = useState<string>("there");
  const [counts, setCounts] = useState({ documents: 0, skills: 0, certifications: 0, projects: 0, internships: 0, achievements: 0 });
  const [recent, setRecent] = useState<DocRow[]>([]);
  const [skills, setSkills] = useState<SkillRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("name, email").eq("id", u.user.id).maybeSingle();
      setName((p?.name || p?.email?.split("@")[0] || "there").split(" ")[0]);

      const tables = ["documents", "skills", "certifications", "projects", "internships", "achievements"] as const;
      const results = await Promise.all(tables.map((t) => supabase.from(t).select("*", { count: "exact", head: true })));
      setCounts({
        documents: results[0].count ?? 0,
        skills: results[1].count ?? 0,
        certifications: results[2].count ?? 0,
        projects: results[3].count ?? 0,
        internships: results[4].count ?? 0,
        achievements: results[5].count ?? 0,
      });

      const { data: docs } = await supabase
        .from("documents")
        .select("id, name, doc_type, size_bytes, tags, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      setRecent((docs ?? []) as DocRow[]);

      const { data: sk } = await supabase.from("skills").select("name, level").order("level", { ascending: false }).limit(6);
      setSkills((sk ?? []) as SkillRow[]);
    };
    load();
  }, []);

  const statCards = [
    { label: "Total Documents", value: counts.documents, icon: FileText },
    { label: "Skills Identified", value: counts.skills, icon: Sparkles },
    { label: "Certifications", value: counts.certifications, icon: Award },
    { label: "Projects", value: counts.projects, icon: Code2 },
    { label: "Internships", value: counts.internships, icon: Briefcase },
    { label: "Achievements", value: counts.achievements, icon: Trophy },
  ];

  const skillsToShow = skills.length > 0 ? skills : fallbackSkills.slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-primary p-6 text-primary-foreground shadow-elegant md:p-8">
        <div className="absolute inset-0 bg-mesh opacity-50" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge className="mb-3 border-white/20 bg-white/15 text-primary-foreground hover:bg-white/20">
              <Sparkles className="mr-1 h-3 w-3" /> AI-powered identity
            </Badge>
            <h1 className="font-display text-2xl font-semibold md:text-3xl">
              Welcome back, {name}.
            </h1>
            <p className="mt-1 max-w-xl text-sm text-primary-foreground/80">
              You have {counts.documents} {counts.documents === 1 ? "document" : "documents"} in your identity. Upload more to unlock skills and connections.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link to="/upload">Upload documents</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20">
              <Link to="/search">Ask AI</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s) => (
          <Card key={s.label} className="group relative overflow-hidden p-5 transition-shadow hover:shadow-elegant">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </div>
            <div className="mt-4">
              <div className="font-display text-3xl font-semibold tracking-tight">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          </Card>
        ))}
      </section>

      {/* Activity + skills */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Document activity</h2>
              <p className="text-xs text-muted-foreground">Uploads over the last 6 months</p>
            </div>
            <Badge variant="secondary" className="gap-1"><TrendingUp className="h-3 w-3" /> +38%</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={documentTrend}>
                <defs>
                  <linearGradient id="uploads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    color: "var(--color-popover-foreground)",
                  }}
                />
                <Area type="monotone" dataKey="uploads" stroke="var(--color-primary)" strokeWidth={2} fill="url(#uploads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold">Top skills</h2>
          <p className="text-xs text-muted-foreground">Detected from your documents</p>
          <div className="mt-4 space-y-4">
            {skillsToShow.map((s) => (
              <div key={s.name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.level}%</span>
                </div>
                <Progress value={s.level} className="h-1.5" />
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Recent uploads */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Recent uploads</h2>
            <p className="text-xs text-muted-foreground">Files added in the last few weeks</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/upload">View all</Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            No uploads yet. <Link to="/upload" className="text-primary hover:underline">Add your first document</Link>.
          </Card>
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {recent.map((d) => (
              <div key={d.id} className="flex items-center gap-4 p-4 transition hover:bg-muted/40">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.doc_type} · {fmtSize(d.size_bytes)} · {new Date(d.created_at).toLocaleDateString()}</div>
                </div>
                <div className="hidden flex-wrap gap-1.5 md:flex">
                  {d.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}