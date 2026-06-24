import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, FileText, Sparkles, TrendingUp } from "lucide-react";
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
import { documentTrend, profile, recentUploads, skills, stats } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — IdentityOS" },
      { name: "description", content: "Your AI-curated overview of documents, skills, certifications, projects, and internships." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
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
              Welcome back, {profile.name.split(" ")[0]}.
            </h1>
            <p className="mt-1 max-w-xl text-sm text-primary-foreground/80">
              You've added 6 new documents this month. We extracted 4 new skills and 2 certifications.
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
        {stats.map((s) => (
          <Card key={s.key} className="group relative overflow-hidden p-5 transition-shadow hover:shadow-elegant">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </div>
            <div className="mt-4">
              <div className="font-display text-3xl font-semibold tracking-tight">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className="mt-2 text-xs text-primary">{s.delta}</div>
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
            {skills.slice(0, 6).map((s) => (
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
        <Card className="divide-y overflow-hidden p-0">
          {recentUploads.map((d) => (
            <div key={d.id} className="flex items-center gap-4 p-4 transition hover:bg-muted/40">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground">{d.type} · {d.size} · {d.uploaded}</div>
              </div>
              <div className="hidden flex-wrap gap-1.5 md:flex">
                {d.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
              </div>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}