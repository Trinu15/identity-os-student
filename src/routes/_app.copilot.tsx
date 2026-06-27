import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2, Compass, Sparkles, CheckCircle2, AlertCircle,
  Rocket, Award, FolderGit2, ArrowRight, Target, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { careerCopilot } from "@/lib/copilot.functions";

export const Route = createFileRoute("/_app/copilot")({
  head: () => ({ meta: [{ title: "Career Copilot — IdentityOS" }] }),
  component: CopilotPage,
});

const PRESETS = ["AI Engineer", "Data Scientist", "MLOps Engineer", "Full Stack Developer"];

type Analysis = Awaited<ReturnType<typeof careerCopilot>>;

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

const PHASE_META: Record<string, { color: string; icon: typeof Rocket }> = {
  Now: { color: "from-rose-500 to-orange-500", icon: Target },
  Next: { color: "from-blue-500 to-violet-500", icon: TrendingUp },
  Later: { color: "from-emerald-500 to-teal-500", icon: Rocket },
};

function CopilotPage() {
  const run = useServerFn(careerCopilot);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Analysis | null>(null);

  const analyze = async (target: string) => {
    const r = target.trim();
    if (!r) return toast.error("Enter a target role");
    setLoading(true);
    setData(null);
    try {
      const res = await run({ data: { role: r } });
      setData(res);
      setRole(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to analyze");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Career copilot</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a target role. We'll analyze your skills, projects, certifications and internships, and map your path forward.
          </p>
        </div>
      </header>

      <Card className="p-5">
        <form
          onSubmit={(e) => { e.preventDefault(); analyze(role); }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Compass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. AI Engineer, Data Scientist, Full Stack Developer…"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Analyzing…" : "Analyze fit"}
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => { setRole(p); analyze(p); }}
              disabled={loading}
              className="rounded-full border bg-card px-3 py-1 text-xs hover:bg-accent disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      </Card>

      {loading && (
        <Card className="flex items-center justify-center p-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mapping your path to {role}…
        </Card>
      )}

      {!loading && !data && (
        <Card className="p-10 text-center">
          <Compass className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">
            Enter a role above to see your personalized roadmap.
          </p>
        </Card>
      )}

      {data && <Results data={data} />}
    </div>
  );
}

function Results({ data }: { data: Analysis }) {
  return (
    <div className="space-y-6">
      {/* Readiness */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Target role</div>
            <div className="font-display text-2xl font-semibold">{data.role}</div>
            {data.summary && <p className="mt-2 text-sm text-muted-foreground">{data.summary}</p>}
          </div>
          <div className="w-full max-w-[260px]">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Readiness</span>
              <span className="font-mono font-semibold">{data.readiness}%</span>
            </div>
            <Progress value={data.readiness} className="h-2" />
            <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
              <span>{data.inventoryCounts.skills} skills</span>
              <span>{data.inventoryCounts.projects} projects</span>
              <span>{data.inventoryCounts.certifications} certs</span>
              <span>{data.inventoryCounts.internships} intern.</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Roadmap */}
      {data.roadmap.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">Your roadmap</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {data.roadmap.map((phase: any, i: number) => {
              const meta = PHASE_META[phase.phase as string] ?? PHASE_META.Now;
              const Icon = meta.icon;
              return (
                <Card key={i} className="relative overflow-hidden p-5">
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.color}`} />
                  <div className="mb-3 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${meta.color} text-white shadow`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Phase {i + 1}</div>
                      <div className="font-semibold">{phase.phase}</div>
                    </div>
                  </div>
                  {phase.title && <div className="mb-2 text-sm font-medium">{phase.title}</div>}
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {(phase.items ?? []).map((it: string, j: number) => (
                      <li key={j} className="flex gap-2">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-none text-foreground/40" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Strengths */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h3 className="font-semibold">Current strengths</h3>
          </div>
          {data.strengths.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching strengths yet — add documents to your vault.</p>
          ) : (
            <ul className="space-y-3">
              {data.strengths.map((s: any, i: number) => (
                <li key={i} className="rounded-lg border bg-card/40 p-3">
                  <div className="text-sm font-medium">{s.title}</div>
                  {s.detail && <div className="mt-0.5 text-xs text-muted-foreground">{s.detail}</div>}
                  {s.evidence && (
                    <Badge variant="outline" className="mt-2 font-normal text-[10px]">
                      Evidence: {s.evidence}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Missing skills */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold">Missing skills</h3>
          </div>
          {data.missingSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground">You're covered on the core skills for this role.</p>
          ) : (
            <ul className="space-y-2">
              {data.missingSkills.map((m: any, i: number) => (
                <li key={i} className="flex items-start gap-2 rounded-lg border bg-card/40 p-3">
                  <Badge
                    variant="outline"
                    className={`mt-0.5 text-[10px] font-medium uppercase ${PRIORITY_COLORS[m.priority] ?? ""}`}
                  >
                    {m.priority ?? "med"}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{m.name}</div>
                    {m.why && <div className="mt-0.5 text-xs text-muted-foreground">{m.why}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Next steps */}
      {data.nextSteps.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Rocket className="h-4 w-4 text-violet-500" />
            <h3 className="font-semibold">Recommended next steps</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.nextSteps.map((s: any, i: number) => (
              <div key={i} className="rounded-lg border bg-card/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium">{s.title}</div>
                  {s.timeframe && (
                    <Badge variant="secondary" className="flex-none text-[10px] font-normal">
                      {s.timeframe}
                    </Badge>
                  )}
                </div>
                {s.detail && <div className="mt-1 text-xs text-muted-foreground">{s.detail}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Suggested certifications */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold">Suggested certifications</h3>
          </div>
          {data.suggestedCertifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No certification gaps detected.</p>
          ) : (
            <ul className="space-y-2">
              {data.suggestedCertifications.map((c: any, i: number) => (
                <li key={i} className="rounded-lg border bg-card/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{c.name}</div>
                    {c.provider && (
                      <Badge variant="outline" className="text-[10px] font-normal">{c.provider}</Badge>
                    )}
                  </div>
                  {c.why && <div className="mt-1 text-xs text-muted-foreground">{c.why}</div>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Suggested projects */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <FolderGit2 className="h-4 w-4 text-pink-500" />
            <h3 className="font-semibold">Suggested projects</h3>
          </div>
          {data.suggestedProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No project ideas — your portfolio already covers this role.</p>
          ) : (
            <ul className="space-y-2">
              {data.suggestedProjects.map((p: any, i: number) => (
                <li key={i} className="rounded-lg border bg-card/40 p-3">
                  <div className="text-sm font-medium">{p.title}</div>
                  {p.description && <div className="mt-1 text-xs text-muted-foreground">{p.description}</div>}
                  {Array.isArray(p.skills) && p.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.skills.map((s: string, j: number) => (
                        <Badge key={j} variant="secondary" className="text-[10px] font-normal">{s}</Badge>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}