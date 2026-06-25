import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Search, ZoomIn, ZoomOut, Maximize2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { rebuildRelationships } from "@/lib/relationships.functions";

export const Route = createFileRoute("/_app/graph")({
  head: () => ({ meta: [{ title: "Knowledge Graph — IdentityOS" }] }),
  component: GraphPage,
});

type NodeKind = "Skill" | "Project" | "Certification" | "Internship" | "Achievement";

type GNode = {
  id: string;
  name: string;
  kind: NodeKind;
  meta?: string;
  // runtime fields injected by force-graph
  x?: number; y?: number; vx?: number; vy?: number;
};

type GLink = {
  source: string | GNode;
  target: string | GNode;
  label?: string;
  confidence?: number;
};

type DocLite = {
  id: string;
  name: string;
  doc_type: string;
  category: string | null;
  created_at: string;
  extracted: any;
};

const KIND_COLORS: Record<NodeKind, string> = {
  Skill: "#60a5fa",          // blue-400
  Project: "#f472b6",        // pink-400
  Certification: "#34d399",  // emerald-400
  Internship: "#fbbf24",     // amber-400
  Achievement: "#a78bfa",    // violet-400
};

const KIND_ORDER: NodeKind[] = ["Skill", "Project", "Certification", "Internship", "Achievement"];

function GraphPage() {
  const discover = useServerFn(rebuildRelationships);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<GNode[]>([]);
  const [links, setLinks] = useState<GLink[]>([]);
  const [docs, setDocs] = useState<DocLite[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<GNode | null>(null);
  const [activeKinds, setActiveKinds] = useState<Set<NodeKind>>(new Set(KIND_ORDER));
  const wrapRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });

  // Dynamically loaded react-force-graph-2d (avoids SSR window references)
  const [ForceGraph, setForceGraph] = useState<any>(null);
  useEffect(() => {
    let cancelled = false;
    import("react-force-graph-2d").then((m) => {
      if (!cancelled) setForceGraph(() => m.default);
    });
    return () => { cancelled = true; };
  }, []);

  // Resize observer for the canvas wrapper
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(300, r.width), h: Math.max(420, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const load = async () => {
    setLoading(true);
    const [skills, projects, certs, ints, achs, rels, docsR] = await Promise.all([
      supabase.from("skills").select("id, name, category"),
      supabase.from("projects").select("id, title, tech"),
      supabase.from("certifications").select("id, name, issuer"),
      supabase.from("internships").select("id, company, role"),
      supabase.from("achievements").select("id, title, description"),
      supabase.from("relationships").select("id, source_type, source_id, target_type, target_id, label, confidence"),
      supabase.from("documents").select("id, name, doc_type, category, created_at, extracted").order("created_at", { ascending: false }),
    ]);

    const ns: GNode[] = [];
    const idByKey = (kind: NodeKind, id: string) => `${kind}:${id}`;
    (skills.data ?? []).forEach((r: any) => ns.push({ id: idByKey("Skill", r.id), name: r.name, kind: "Skill", meta: r.category ?? undefined }));
    (projects.data ?? []).forEach((r: any) => ns.push({ id: idByKey("Project", r.id), name: r.title, kind: "Project", meta: (r.tech ?? []).slice(0, 3).join(", ") || undefined }));
    (certs.data ?? []).forEach((r: any) => ns.push({ id: idByKey("Certification", r.id), name: r.name, kind: "Certification", meta: r.issuer ?? undefined }));
    (ints.data ?? []).forEach((r: any) => ns.push({ id: idByKey("Internship", r.id), name: `${r.role} @ ${r.company}`, kind: "Internship" }));
    (achs.data ?? []).forEach((r: any) => ns.push({ id: idByKey("Achievement", r.id), name: r.title, kind: "Achievement", meta: r.description ?? undefined }));

    const nodeIds = new Set(ns.map((n) => n.id));
    const ls: GLink[] = [];
    (rels.data ?? []).forEach((r: any) => {
      const src = r.source_id ? idByKey(r.source_type as NodeKind, r.source_id) : null;
      const tgt = r.target_id ? idByKey(r.target_type as NodeKind, r.target_id) : null;
      if (!src || !tgt) return;
      if (!nodeIds.has(src) || !nodeIds.has(tgt)) return;
      ls.push({ source: src, target: tgt, label: r.label ?? undefined, confidence: r.confidence ?? undefined });
    });

    setNodes(ns);
    setLinks(ls);
    setDocs((docsR.data ?? []) as DocLite[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Live update: refresh graph when documents table changes
  useEffect(() => {
    const ch = supabase
      .channel("graph-doc-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "relationships" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const runDiscovery = async () => {
    setRunning(true);
    try {
      const res = await discover();
      toast.success(`Discovered ${res.edges} relationship${res.edges === 1 ? "" : "s"}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to discover relationships");
    } finally {
      setRunning(false);
    }
  };

  // Find supporting documents for the selected node by fuzzy name matching against extracted metadata
  const supportingDocs = useMemo(() => {
    if (!selected) return [];
    const needle = selected.name.toLowerCase().trim();
    const matches: DocLite[] = [];
    for (const d of docs) {
      const ex = d.extracted ?? {};
      const blobs: string[] = [];
      const pushAll = (v: any) => {
        if (!v) return;
        if (typeof v === "string") blobs.push(v);
        else if (Array.isArray(v)) v.forEach((x) => typeof x === "string" ? blobs.push(x) : (x && typeof x === "object" && Object.values(x).forEach(pushAll)));
        else if (typeof v === "object") Object.values(v).forEach(pushAll);
      };
      pushAll(ex.title); pushAll(ex.organization);
      pushAll(ex.skills); pushAll(ex.technologies);
      pushAll(ex.projects); pushAll(ex.certifications);
      pushAll(ex.internships); pushAll(ex.achievements);
      blobs.push(d.name);
      if (blobs.some((s) => s.toLowerCase().includes(needle))) matches.push(d);
    }
    return matches;
  }, [selected, docs]);

  const filteredData = useMemo(() => {
    const q = query.toLowerCase().trim();
    const visible = nodes.filter((n) => activeKinds.has(n.kind));
    const visibleIds = new Set(visible.map((n) => n.id));
    const ls = links.filter((l) => {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      return visibleIds.has(s) && visibleIds.has(t);
    });
    return {
      nodes: visible.map((n) => ({ ...n, _dim: q.length > 0 && !n.name.toLowerCase().includes(q) })),
      links: ls,
    };
  }, [nodes, links, query, activeKinds]);

  const searchHits = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [] as GNode[];
    return nodes.filter((n) => n.name.toLowerCase().includes(q)).slice(0, 6);
  }, [nodes, query]);

  const focusNode = (n: GNode) => {
    setSelected(n);
    const fg = fgRef.current;
    if (fg && typeof n.x === "number" && typeof n.y === "number") {
      fg.centerAt(n.x, n.y, 600);
      fg.zoom(3, 600);
    }
  };

  const toggleKind = (k: NodeKind) => {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const zoomBy = (factor: number) => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.zoom(fg.zoom() * factor, 300);
  };
  const fitAll = () => fgRef.current?.zoomToFit(500, 60);

  const counts = useMemo(() => {
    const c: Record<NodeKind, number> = { Skill: 0, Project: 0, Certification: 0, Internship: 0, Achievement: 0 };
    nodes.forEach((n) => { c[n.kind] += 1; });
    return c;
  }, [nodes]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Knowledge graph</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Interactive map of your skills, projects, credentials and experiences. Updates automatically as you upload documents.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => zoomBy(1.4)} className="gap-1"><ZoomIn className="h-4 w-4" /> Zoom in</Button>
          <Button variant="outline" size="sm" onClick={() => zoomBy(1 / 1.4)} className="gap-1"><ZoomOut className="h-4 w-4" /> Zoom out</Button>
          <Button variant="outline" size="sm" onClick={fitAll} className="gap-1"><Maximize2 className="h-4 w-4" /> Fit</Button>
          <Button onClick={runDiscovery} disabled={running} size="sm" className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {running ? "Discovering…" : "Discover with AI"}
          </Button>
        </div>
      </header>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search nodes by name…"
              className="pl-9"
            />
            {searchHits.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                {searchHits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => { focusNode(h); setQuery(""); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLORS[h.kind] }} />
                    <span className="truncate">{h.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{h.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {KIND_ORDER.map((k) => {
              const active = activeKinds.has(k);
              return (
                <button
                  key={k}
                  onClick={() => toggleKind(k)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${active ? "bg-card" : "bg-muted/50 opacity-50"}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLORS[k] }} />
                  <span className="font-medium">{k}</span>
                  <span className="text-muted-foreground">{counts[k]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div ref={wrapRef} className="relative h-[560px] w-full bg-mesh">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && nodes.length === 0 && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <p>No graph data yet.</p>
              <p>Upload documents to populate your knowledge graph.</p>
            </div>
          )}
          {ForceGraph && (
            <ForceGraph
              ref={fgRef}
              graphData={filteredData}
              width={size.w}
              height={size.h}
              backgroundColor="rgba(0,0,0,0)"
              nodeRelSize={6}
              cooldownTicks={120}
              minZoom={0.3}
              maxZoom={6}
              enableZoomInteraction
              enablePanInteraction
              linkColor={() => "rgba(148,163,184,0.45)"}
              linkWidth={(l: any) => 1 + (l.confidence ?? 0.5) * 1.5}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={0.92}
              linkDirectionalParticles={(l: any) => ((l.confidence ?? 0) > 0.75 ? 2 : 0)}
              linkDirectionalParticleWidth={2}
              linkLabel={(l: any) => l.label ?? ""}
              onNodeClick={(n: any) => focusNode(n as GNode)}
              onBackgroundClick={() => setSelected(null)}
              nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, scale: number) => {
                const n = node as GNode & { _dim?: boolean };
                const color = KIND_COLORS[n.kind];
                const isSelected = selected?.id === n.id;
                const r = isSelected ? 8 : 6;
                ctx.globalAlpha = n._dim ? 0.2 : 1;
                // halo
                ctx.beginPath();
                ctx.fillStyle = color + "33";
                ctx.arc(n.x ?? 0, n.y ?? 0, r + 4, 0, Math.PI * 2);
                ctx.fill();
                // node
                ctx.beginPath();
                ctx.fillStyle = color;
                ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(15,23,42,0.6)";
                ctx.lineWidth = isSelected ? 2 : 1;
                ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // label
                if (scale > 0.9 || isSelected) {
                  const label = n.name.length > 24 ? n.name.slice(0, 22) + "…" : n.name;
                  ctx.font = `${isSelected ? 600 : 500} ${12 / Math.max(scale, 0.6)}px Inter, sans-serif`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "top";
                  ctx.fillStyle = "rgba(148,163,184,0.95)";
                  ctx.fillText(label, n.x ?? 0, (n.y ?? 0) + r + 3);
                }
                ctx.globalAlpha = 1;
              }}
              nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x ?? 0, node.y ?? 0, 10, 0, Math.PI * 2);
                ctx.fill();
              }}
            />
          )}

          {/* Legend */}
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-md border bg-card/80 px-3 py-2 text-[11px] backdrop-blur">
            {KIND_ORDER.map((k) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLORS[k] }} />
                <span className="text-muted-foreground">{k}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && (
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLORS[selected.kind] }} />
              )}
              <span>{selected?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{selected.kind}</Badge>
                {selected.meta && <Badge variant="outline" className="font-normal">{selected.meta}</Badge>}
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Connections
                </div>
                <div className="space-y-1.5">
                  {links
                    .filter((l) => {
                      const s = typeof l.source === "string" ? l.source : l.source.id;
                      const t = typeof l.target === "string" ? l.target : l.target.id;
                      return s === selected.id || t === selected.id;
                    })
                    .slice(0, 10)
                    .map((l, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md border bg-card/40 px-2.5 py-1.5 text-xs">
                        <span className="truncate">{l.label ?? "related to"}</span>
                        {typeof l.confidence === "number" && (
                          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {Math.round(l.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    ))}
                  {links.filter((l) => {
                    const s = typeof l.source === "string" ? l.source : l.source.id;
                    const t = typeof l.target === "string" ? l.target : l.target.id;
                    return s === selected.id || t === selected.id;
                  }).length === 0 && (
                    <div className="text-xs text-muted-foreground">No relationships discovered yet.</div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Supporting documents
                </div>
                {supportingDocs.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    No documents reference this yet. Upload a document mentioning "{selected.name}" to back it up.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {supportingDocs.slice(0, 8).map((d) => (
                      <div key={d.id} className="flex items-center gap-2 rounded-md border bg-card/40 px-2.5 py-1.5 text-xs">
                        <FileText className="h-3.5 w-3.5 flex-none text-muted-foreground" />
                        <span className="truncate">{d.name}</span>
                        <Badge variant="outline" className="ml-auto font-normal text-[10px]">{d.doc_type}</Badge>
                      </div>
                    ))}
                    {supportingDocs.length > 8 && (
                      <div className="text-[11px] text-muted-foreground">+{supportingDocs.length - 8} more</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <a href="/upload" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  Manage documents <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}