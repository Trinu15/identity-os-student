import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { graphEdges, graphNodes } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { rebuildRelationships } from "@/lib/relationships.functions";

export const Route = createFileRoute("/_app/graph")({
  head: () => ({ meta: [{ title: "Knowledge Graph — IdentityOS" }] }),
  component: GraphPage,
});

const groupColor: Record<string, string> = {
  self: "var(--color-primary)",
  education: "var(--color-chart-2)",
  work: "var(--color-chart-3)",
  project: "var(--color-chart-4)",
  award: "var(--color-chart-5)",
  cert: "var(--color-accent)",
  skill: "var(--color-primary-glow)",
};

function GraphPage() {
  const discover = useServerFn(rebuildRelationships);
  const [running, setRunning] = useState(false);
  const [rels, setRels] = useState<
    { id: string; source_type: string; target_type: string; label: string | null; confidence: number | null; created_at: string }[]
  >([]);

  const loadRels = async () => {
    const { data } = await supabase
      .from("relationships")
      .select("id, source_type, target_type, label, confidence, created_at")
      .order("confidence", { ascending: false })
      .limit(100);
    setRels((data ?? []) as any);
  };

  useEffect(() => { loadRels(); }, []);

  const runDiscovery = async () => {
    setRunning(true);
    try {
      const res = await discover();
      toast.success(`Discovered ${res.edges} relationship${res.edges === 1 ? "" : "s"}`);
      await loadRels();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to discover relationships");
    } finally {
      setRunning(false);
    }
  };

  const groups = [
    { key: "Certification->Skill", title: "Certifications validate Skills" },
    { key: "Skill->Project", title: "Skills power Projects" },
    { key: "Project->Internship", title: "Projects lead to Internships" },
    { key: "Internship->CareerGoal", title: "Internships advance Career Goals" },
  ] as const;

  // radial layout
  const center = { x: 400, y: 320 };
  const radius = 230;
  const others = graphNodes.filter((n) => n.id !== "you");
  const positions: Record<string, { x: number; y: number }> = { you: center };
  others.forEach((n, i) => {
    const angle = (i / others.length) * Math.PI * 2 - Math.PI / 2;
    positions[n.id] = {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold">Knowledge graph</h1>
            <p className="mt-1 text-sm text-muted-foreground">How your experiences, skills, and credentials connect.</p>
          </div>
          <Button onClick={runDiscovery} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {running ? "Discovering…" : "Discover with AI"}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {Object.entries(groupColor).map(([k, c]) => (
          <Badge key={k} variant="outline" className="gap-1.5 capitalize">
            <span className="h-2 w-2 rounded-full" style={{ background: c }} />
            {k}
          </Badge>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="relative aspect-[5/4] w-full bg-mesh">
          <svg viewBox="0 0 800 640" className="absolute inset-0 h-full w-full">
            {graphEdges.map(([a, b], i) => {
              const p1 = positions[a]; const p2 = positions[b];
              if (!p1 || !p2) return null;
              return (
                <line
                  key={i}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke="var(--color-border)" strokeWidth={1.5}
                />
              );
            })}
            {graphNodes.map((n) => {
              const pos = positions[n.id];
              const isYou = n.id === "you";
              const r = isYou ? 36 : 26;
              return (
                <g key={n.id} transform={`translate(${pos.x}, ${pos.y})`}>
                  <circle
                    r={r + 6}
                    fill={groupColor[n.group]}
                    opacity={0.18}
                  />
                  <circle r={r} fill={groupColor[n.group]} stroke="var(--color-background)" strokeWidth={2} />
                  <text
                    y={r + 16}
                    textAnchor="middle"
                    fontSize={12}
                    fontFamily="Inter, sans-serif"
                    fill="var(--color-foreground)"
                    fontWeight={isYou ? 700 : 500}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">AI-discovered relationships</h2>
          <p className="text-xs text-muted-foreground">
            {rels.length === 0
              ? "Click Discover with AI to map how your credentials, skills, projects and internships connect."
              : `${rels.length} connection${rels.length === 1 ? "" : "s"} found across your identity.`}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((g) => {
            const items = rels.filter((r) => `${r.source_type}->${r.target_type}` === g.key);
            return (
              <Card key={g.key} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{g.title}</div>
                  <Badge variant="secondary" className="font-mono text-[10px]">{items.length}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {items.length === 0 && (
                    <div className="text-xs text-muted-foreground">No connections yet.</div>
                  )}
                  {items.slice(0, 6).map((r) => {
                    const parts = (r.label ?? "").split(" → ");
                    const left = parts[0] ?? "—";
                    const rightRaw = parts[1] ?? "";
                    const [right, note] = rightRaw.split(" · ");
                    return (
                      <div key={r.id} className="flex items-center gap-2 rounded-md border bg-card/40 px-3 py-2 text-xs">
                        <span className="truncate font-medium">{left}</span>
                        <ArrowRight className="h-3 w-3 flex-none text-muted-foreground" />
                        <span className="truncate text-foreground/90">{right}</span>
                        {note && <span className="ml-auto hidden truncate text-muted-foreground sm:inline">{note}</span>}
                        <span className="ml-auto flex-none rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {Math.round((r.confidence ?? 0) * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}