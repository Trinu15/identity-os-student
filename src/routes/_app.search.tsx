import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Send, Sparkles, FileText, Award, Briefcase, Code2, Trophy, Brain,
  Eye, ExternalLink, Loader2, Plus,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { aiSearch } from "@/lib/search.functions";

export const Route = createFileRoute("/_app/search")({
  head: () => ({ meta: [{ title: "AI Search — IdentityOS" }] }),
  component: SearchPage,
});

type DocRef = {
  id: string; name: string; doc_type: string | null; category: string | null;
  storage_path: string; mime_type: string | null; created_at: string;
};
type SkillRef = { id: string; name: string; level: number | null; category: string | null };
type CertRef = { id: string; name: string; issuer: string | null; issued_at: string | null };
type ProjRef = { id: string; title: string; tech: string[] | null };
type IntRef = { id: string; company: string; role: string };
type AchRef = { id: string; title: string; awarded_at: string | null };

type SearchResult = {
  answer: string;
  documentIds: string[]; skillIds: string[]; certificationIds: string[];
  projectIds: string[]; internshipIds: string[]; achievementIds: string[];
};

type Turn =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; result?: SearchResult; loading?: boolean; error?: string };

const SUGGESTIONS = [
  "Show all my certificates",
  "Show my AI projects",
  "Show internship documents",
  "Show my latest resume",
  "What skills do I have?",
];

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d! : dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function SearchPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const [docs, setDocs] = useState<Record<string, DocRef>>({});
  const [skills, setSkills] = useState<Record<string, SkillRef>>({});
  const [certs, setCerts] = useState<Record<string, CertRef>>({});
  const [projs, setProjs] = useState<Record<string, ProjRef>>({});
  const [ints, setInts] = useState<Record<string, IntRef>>({});
  const [achs, setAchs] = useState<Record<string, AchRef>>({});

  const [preview, setPreview] = useState<{ doc: DocRef; url: string } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const runSearch = useServerFn(aiSearch);

  // Load index references for rendering
  useEffect(() => {
    (async () => {
      const [d, s, c, p, i, a] = await Promise.all([
        supabase.from("documents").select("id, name, doc_type, category, storage_path, mime_type, created_at"),
        supabase.from("skills").select("id, name, level, category"),
        supabase.from("certifications").select("id, name, issuer, issued_at"),
        supabase.from("projects").select("id, title, tech"),
        supabase.from("internships").select("id, company, role"),
        supabase.from("achievements").select("id, title, awarded_at"),
      ]);
      const idx = <T extends { id: string }>(rows: T[] | null | undefined) =>
        Object.fromEntries((rows ?? []).map((r) => [r.id, r])) as Record<string, T>;
      setDocs(idx(d.data as any));
      setSkills(idx(s.data as any));
      setCerts(idx(c.data as any));
      setProjs(idx(p.data as any));
      setInts(idx(i.data as any));
      setAchs(idx(a.data as any));
    })().catch((e) => {
      console.error("[search] load index failed", e);
      toast.error("Could not load your library.");
    });
  }, []);

  // Auto-scroll + focus input
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns]);
  useEffect(() => { taRef.current?.focus(); }, []);

  const history = useMemo(
    () =>
      turns
        .filter((t) => t.role === "user" || (t.role === "assistant" && t.content && !t.loading))
        .map((t) => ({ role: t.role, content: t.content }))
        .slice(-10),
    [turns],
  );

  const ask = async (q: string) => {
    const query = q.trim();
    if (!query || busy) return;
    setInput("");
    setBusy(true);
    const userTurn: Turn = { id: `u${Date.now()}`, role: "user", content: query };
    const placeholder: Turn = {
      id: `a${Date.now()}`, role: "assistant", content: "", loading: true,
    };
    const sentHistory = history;
    setTurns((t) => [...t, userTurn, placeholder]);

    try {
      const res = (await runSearch({ data: { query, history: sentHistory } })) as SearchResult;
      setTurns((t) =>
        t.map((x) =>
          x.id === placeholder.id
            ? { ...x, loading: false, content: res.answer, result: res }
            : x,
        ),
      );
    } catch (e: any) {
      console.error("[search] failed", e);
      const msg = e?.message ?? "Something went wrong.";
      setTurns((t) =>
        t.map((x) =>
          x.id === placeholder.id
            ? { ...x, loading: false, content: msg, error: msg }
            : x,
        ),
      );
      toast.error(msg);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => taRef.current?.focus());
    }
  };

  const openDoc = async (doc: DocRef) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 600);
    if (error || !data) {
      console.error("[search] signed url failed", error);
      toast.error("Could not load document preview.");
      return;
    }
    setPreview({ doc, url: data.signedUrl });
  };

  const reset = () => setTurns([]);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <header className="flex items-center justify-between gap-3 pb-4">
        <div>
          <Badge variant="secondary" className="mb-2 gap-1">
            <Sparkles className="h-3 w-3" /> Conversational AI
          </Badge>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Ask your identity vault</h1>
          <p className="text-sm text-muted-foreground">
            Semantic search across every document, skill, certificate, project, and internship.
          </p>
        </div>
        {turns.length > 0 && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-1">
            <Plus className="h-4 w-4" /> New chat
          </Button>
        )}
      </header>

      {/* Transcript */}
      <div ref={scroller} className="flex-1 space-y-6 overflow-y-auto pr-1">
        {turns.length === 0 && (
          <Card className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              IdentityOS AI
            </div>
            <p className="text-sm text-muted-foreground">
              Ask anything in natural language — I'll search across everything you've uploaded and link back to the source files.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>
        )}

        {turns.map((t) =>
          t.role === "user" ? (
            <div key={t.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-elegant">
                {t.content}
              </div>
            </div>
          ) : (
            <div key={t.id} className="flex gap-3">
              <div className="mt-1 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                {t.loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Searching your vault…
                  </div>
                ) : (
                  <>
                    <p className={`whitespace-pre-line text-sm leading-relaxed ${t.error ? "text-destructive" : "text-foreground"}`}>
                      {t.content}
                    </p>
                    {t.result && (
                      <ResultCards
                        result={t.result}
                        docs={docs} skills={skills} certs={certs}
                        projs={projs} ints={ints} achs={achs}
                        onOpenDoc={openDoc}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="mt-4 flex items-end gap-2"
      >
        <Textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); }
          }}
          rows={1}
          placeholder='Try "Show my AI projects" or "What skills do I have?"'
          className="min-h-[44px] resize-none"
          disabled={busy}
        />
        <Button
          type="submit"
          disabled={busy || !input.trim()}
          className="h-11 gap-1 bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Ask
        </Button>
      </form>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 truncate">
                  <span className="truncate">{preview.doc.name}</span>
                  <a href={preview.url} target="_blank" rel="noreferrer" className="text-primary hover:underline" aria-label="Open in new tab">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </DialogTitle>
              </DialogHeader>
              <div className="aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
                {preview.doc.mime_type?.startsWith("image/") ? (
                  <img src={preview.url} alt={preview.doc.name} className="h-full w-full object-contain" />
                ) : (
                  <iframe src={preview.url} title={preview.doc.name} className="h-full w-full" />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResultCards({
  result, docs, skills, certs, projs, ints, achs, onOpenDoc,
}: {
  result: SearchResult;
  docs: Record<string, DocRef>;
  skills: Record<string, SkillRef>;
  certs: Record<string, CertRef>;
  projs: Record<string, ProjRef>;
  ints: Record<string, IntRef>;
  achs: Record<string, AchRef>;
  onOpenDoc: (d: DocRef) => void;
}) {
  const docList = result.documentIds.map((id) => docs[id]).filter(Boolean);
  const skillList = result.skillIds.map((id) => skills[id]).filter(Boolean);
  const certList = result.certificationIds.map((id) => certs[id]).filter(Boolean);
  const projList = result.projectIds.map((id) => projs[id]).filter(Boolean);
  const intList = result.internshipIds.map((id) => ints[id]).filter(Boolean);
  const achList = result.achievementIds.map((id) => achs[id]).filter(Boolean);

  const nothing =
    !docList.length && !skillList.length && !certList.length &&
    !projList.length && !intList.length && !achList.length;
  if (nothing) return null;

  return (
    <div className="space-y-3">
      {docList.length > 0 && (
        <Section title="Source documents" icon={FileText}>
          <div className="grid gap-2 sm:grid-cols-2">
            {docList.map((d) => (
              <button
                key={d.id}
                onClick={() => onOpenDoc(d)}
                className="group flex items-center gap-3 rounded-lg border bg-card p-3 text-left text-sm transition hover:border-primary hover:shadow-elegant"
              >
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(d.category ?? d.doc_type ?? "Document")} · {fmtDate(d.created_at)}
                  </div>
                </div>
                <Eye className="h-4 w-4 flex-none text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </Section>
      )}

      {skillList.length > 0 && (
        <Section title="Skills" icon={Brain}>
          <div className="flex flex-wrap gap-1.5">
            {skillList.map((s) => (
              <Badge key={s.id} variant="secondary" className="text-xs">
                {s.name}{typeof s.level === "number" ? ` · ${s.level}` : ""}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {certList.length > 0 && (
        <Section title="Certifications" icon={Award}>
          <CardList items={certList.map((c) => ({
            key: c.id, title: c.name, meta: [c.issuer, fmtDate(c.issued_at)].filter(Boolean).join(" · "),
          }))} />
        </Section>
      )}

      {projList.length > 0 && (
        <Section title="Projects" icon={Code2}>
          <CardList items={projList.map((p) => ({
            key: p.id, title: p.title,
            meta: Array.isArray(p.tech) && p.tech.length ? p.tech.slice(0, 5).join(" · ") : "",
          }))} />
        </Section>
      )}

      {intList.length > 0 && (
        <Section title="Internships" icon={Briefcase}>
          <CardList items={intList.map((i) => ({
            key: i.id, title: `${i.role} @ ${i.company}`, meta: "",
          }))} />
        </Section>
      )}

      {achList.length > 0 && (
        <Section title="Achievements" icon={Trophy}>
          <CardList items={achList.map((a) => ({
            key: a.id, title: a.title, meta: fmtDate(a.awarded_at),
          }))} />
        </Section>
      )}
    </div>
  );
}

function Section({
  title, icon: Icon, children,
}: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {children}
    </div>
  );
}

function CardList({ items }: { items: { key: string; title: string; meta: string }[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.key} className="rounded-lg border bg-card p-3 text-sm">
          <div className="truncate font-medium">{it.title}</div>
          {it.meta && <div className="truncate text-xs text-muted-foreground">{it.meta}</div>}
        </div>
      ))}
    </div>
  );
}
