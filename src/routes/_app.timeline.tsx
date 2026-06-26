import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Award,
  Briefcase,
  Code2,
  FileText,
  GraduationCap,
  Trophy,
  Eye,
  ExternalLink,
} from "lucide-react";
import type { ComponentType } from "react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/timeline")({
  head: () => ({ meta: [{ title: "Digital Timeline — IdentityOS" }] }),
  component: TimelinePage,
});

type EventKind = "certification" | "project" | "internship" | "achievement" | "academic";

type TLEvent = {
  id: string;
  kind: EventKind;
  date: string | null;
  title: string;
  org?: string | null;
  description?: string | null;
  // raw text used to match against documents
  match: string[];
};

type DocRow = {
  id: string;
  name: string;
  doc_type: string | null;
  category: string | null;
  storage_path: string;
  mime_type: string | null;
  created_at: string;
  tags: string[] | null;
  extracted: any;
};

const KIND_META: Record<EventKind, { icon: ComponentType<{ className?: string }>; tone: string; label: string }> = {
  academic: { icon: GraduationCap, tone: "var(--color-chart-2)", label: "Academic" },
  internship: { icon: Briefcase, tone: "var(--color-chart-3)", label: "Internship" },
  project: { icon: Code2, tone: "var(--color-chart-4)", label: "Project" },
  certification: { icon: Award, tone: "var(--color-accent)", label: "Certification" },
  achievement: { icon: Trophy, tone: "var(--color-chart-5)", label: "Achievement" },
};

function yearOf(date: string | null): string {
  if (!date) return "Undated";
  const y = new Date(date).getFullYear();
  return Number.isFinite(y) ? String(y) : "Undated";
}

function fmtDate(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function findRelatedDocs(ev: TLEvent, docs: DocRow[]): DocRow[] {
  const needles = ev.match.map(norm).filter((s) => s.length >= 3);
  if (!needles.length) return [];
  const scored = docs.map((d) => {
    const hay = [
      d.name,
      d.doc_type ?? "",
      d.category ?? "",
      ...(d.tags ?? []),
      d.extracted?.title ?? "",
      d.extracted?.organization ?? "",
      d.extracted?.summary ?? "",
      ...(d.extracted?.skills ?? []),
      ...(d.extracted?.technologies ?? []),
    ]
      .filter(Boolean)
      .map((s: string) => norm(String(s)));
    const hayStr = hay.join(" | ");
    let score = 0;
    for (const n of needles) if (hayStr.includes(n)) score++;
    return { d, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((s) => s.d);
}

function TimelinePage() {
  const [events, setEvents] = useState<TLEvent[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<TLEvent | null>(null);
  const [previewUrl, setPreviewUrl] = useState<{ doc: DocRow; url: string } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [certs, projs, ints, achs, dcs] = await Promise.all([
        supabase.from("certifications").select("id, name, issuer, issued_at, url"),
        supabase.from("projects").select("id, title, description, tech, start_date, end_date, url"),
        supabase.from("internships").select("id, company, role, description, start_date, end_date"),
        supabase.from("achievements").select("id, title, description, awarded_at"),
        supabase
          .from("documents")
          .select("id, name, doc_type, category, storage_path, mime_type, created_at, tags, extracted"),
      ]);

      const list: TLEvent[] = [];

      (certs.data ?? []).forEach((c: any) =>
        list.push({
          id: `cert-${c.id}`,
          kind: "certification",
          date: c.issued_at,
          title: c.name,
          org: c.issuer,
          description: c.url ? c.url : null,
          match: [c.name, c.issuer].filter(Boolean),
        }),
      );
      (projs.data ?? []).forEach((p: any) =>
        list.push({
          id: `proj-${p.id}`,
          kind: "project",
          date: p.end_date ?? p.start_date,
          title: p.title,
          org: Array.isArray(p.tech) ? p.tech.slice(0, 3).join(" · ") : null,
          description: p.description,
          match: [p.title, ...(Array.isArray(p.tech) ? p.tech : [])].filter(Boolean),
        }),
      );
      (ints.data ?? []).forEach((i: any) =>
        list.push({
          id: `int-${i.id}`,
          kind: "internship",
          date: i.start_date ?? i.end_date,
          title: `${i.role ?? "Intern"} @ ${i.company ?? "Unknown"}`,
          org: i.company,
          description: i.description,
          match: [i.company, i.role].filter(Boolean),
        }),
      );
      (achs.data ?? []).forEach((a: any) =>
        list.push({
          id: `ach-${a.id}`,
          kind: "achievement",
          date: a.awarded_at,
          title: a.title,
          org: null,
          description: a.description,
          match: [a.title].filter(Boolean),
        }),
      );

      // Academic milestones from documents categorized "Academics"
      (dcs.data ?? [])
        .filter((d: any) => d.category === "Academics")
        .forEach((d: any) =>
          list.push({
            id: `acad-${d.id}`,
            kind: "academic",
            date: d.extracted?.date ?? d.created_at,
            title: d.extracted?.title || d.name,
            org: d.extracted?.organization ?? null,
            description: d.extracted?.summary ?? null,
            match: [d.name, d.extracted?.title, d.extracted?.organization].filter(Boolean),
          }),
        );

      // sort newest first within timeline (we render newest year first)
      list.sort((a, b) => {
        const at = a.date ? new Date(a.date).getTime() : 0;
        const bt = b.date ? new Date(b.date).getTime() : 0;
        return bt - at;
      });

      setEvents(list);
      setDocs((dcs.data ?? []) as DocRow[]);
      setLoading(false);
    })().catch((e) => {
      console.error("[timeline] load failed", e);
      toast.error("Could not load your timeline.");
      setLoading(false);
    });
  }, []);

  const byYear = useMemo(() => {
    const groups = new Map<string, TLEvent[]>();
    for (const ev of events) {
      const y = yearOf(ev.date);
      if (!groups.has(y)) groups.set(y, []);
      groups.get(y)!.push(ev);
    }
    // Sort years descending, push "Undated" to the bottom
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === "Undated") return 1;
      if (b === "Undated") return -1;
      return Number(b) - Number(a);
    });
  }, [events]);

  const related = useMemo(
    () => (active ? findRelatedDocs(active, docs) : []),
    [active, docs],
  );

  const openDoc = async (doc: DocRow) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 600);
    if (error || !data) {
      console.error("[timeline] signed url failed", error);
      toast.error("Could not load document preview.");
      return;
    }
    setPreviewUrl({ doc, url: data.signedUrl });
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold">Digital journey timeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your certifications, projects, internships, achievements, and academic milestones — grouped by year. Click any milestone to see the documents that prove it.
        </p>
      </header>

      {loading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading timeline…</Card>
      ) : events.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No milestones yet. Upload documents and the timeline builds itself.
        </Card>
      ) : (
        <div className="space-y-12">
          {byYear.map(([year, items]) => (
            <section key={year} className="relative">
              <div className="mb-4 flex items-center gap-3">
                <div className="font-display text-2xl font-semibold tracking-tight">{year}</div>
                <div className="h-px flex-1 bg-border" />
                <Badge variant="secondary" className="text-xs">{items.length} milestone{items.length === 1 ? "" : "s"}</Badge>
              </div>

              <div className="relative">
                <div className="absolute bottom-0 left-5 top-0 w-px bg-border md:left-1/2" />
                <ul className="space-y-6">
                  {items.map((ev, i) => {
                    const m = KIND_META[ev.kind];
                    const Icon = m.icon;
                    const right = i % 2 === 1;
                    return (
                      <li key={ev.id} className="relative md:grid md:grid-cols-2 md:gap-8">
                        <div className="absolute left-5 top-3 -translate-x-1/2 md:left-1/2">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full border-4 shadow-elegant"
                            style={{ background: m.tone, borderColor: "var(--color-background)" }}
                          >
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className={`pl-14 md:pl-0 ${right ? "md:col-start-2 md:pl-12" : "md:pr-12 md:text-right"}`}>
                          <button
                            onClick={() => setActive(ev)}
                            className="w-full text-left"
                          >
                            <Card className="p-5 transition hover:shadow-elegant hover:border-primary/40">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{m.label}</Badge>
                                <span className="text-xs text-muted-foreground">{fmtDate(ev.date)}</span>
                              </div>
                              <h3 className="mt-2 font-display text-lg font-semibold">{ev.title}</h3>
                              {ev.org && <div className="text-sm text-primary">{ev.org}</div>}
                              {ev.description && (
                                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{ev.description}</p>
                              )}
                            </Card>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Item detail dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl">
          {active && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{KIND_META[active.kind].label}</Badge>
                  <span className="text-xs text-muted-foreground">{fmtDate(active.date)}</span>
                </div>
                <DialogTitle className="mt-1 font-display text-2xl">{active.title}</DialogTitle>
                {active.org && <DialogDescription className="text-primary">{active.org}</DialogDescription>}
              </DialogHeader>

              {active.description && (
                <p className="text-sm text-muted-foreground">{active.description}</p>
              )}

              <div className="mt-2">
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Supporting documents
                </div>
                {related.length === 0 ? (
                  <Card className="p-6 text-center text-sm text-muted-foreground">
                    No matching documents found in your library yet.
                  </Card>
                ) : (
                  <Card className="divide-y p-0">
                    {related.map((d) => (
                      <div key={d.id} className="flex items-center gap-3 p-3">
                        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{d.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(d.category ?? d.doc_type ?? "Document")} · {new Date(d.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => openDoc(d)} className="gap-1">
                          <Eye className="h-4 w-4" /> Open
                        </Button>
                      </div>
                    ))}
                  </Card>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Document preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl">
          {previewUrl && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 truncate">
                  <span className="truncate">{previewUrl.doc.name}</span>
                  <a
                    href={previewUrl.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                    aria-label="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </DialogTitle>
              </DialogHeader>
              <div className="aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
                {previewUrl.doc.mime_type?.startsWith("image/") ? (
                  <img src={previewUrl.url} alt={previewUrl.doc.name} className="h-full w-full object-contain" />
                ) : (
                  <iframe src={previewUrl.url} title={previewUrl.doc.name} className="h-full w-full" />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}