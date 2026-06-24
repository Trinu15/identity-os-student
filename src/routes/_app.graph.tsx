import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { graphEdges, graphNodes } from "@/lib/mock-data";

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
        <h1 className="font-display text-3xl font-semibold">Knowledge graph</h1>
        <p className="mt-1 text-sm text-muted-foreground">How your experiences, skills, and credentials connect.</p>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Strongest connections</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>You ↔ TypeScript</span><span className="text-muted-foreground">5 docs</span></div>
            <div className="flex justify-between"><span>You ↔ Stripe</span><span className="text-muted-foreground">4 docs</span></div>
            <div className="flex justify-between"><span>You ↔ IIT Bombay</span><span className="text-muted-foreground">9 docs</span></div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Emerging clusters</div>
          <div className="mt-3 space-y-2 text-sm">
            <div>Distributed systems · 6 nodes</div>
            <div>Cloud infrastructure · 4 nodes</div>
            <div>ML research · 3 nodes</div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Suggested next</div>
          <div className="mt-3 space-y-2 text-sm">
            <div>+ Add LinkedIn endorsements</div>
            <div>+ Link GitHub repositories</div>
            <div>+ Verify Stripe internship</div>
          </div>
        </Card>
      </div>
    </div>
  );
}