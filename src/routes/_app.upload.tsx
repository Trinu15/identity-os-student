import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UploadCloud, FileText, X, CheckCircle2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { recentUploads } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/upload")({
  head: () => ({ meta: [{ title: "Upload — IdentityOS" }] }),
  component: UploadPage,
});

type Pending = { id: string; name: string; size: string; progress: number; done: boolean };

function UploadPage() {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<Pending[]>([
    { id: "p1", name: "Research Paper — Raft Leases.pdf", size: "2.1 MB", progress: 100, done: true },
    { id: "p2", name: "GSoC Acceptance Email.pdf", size: "180 KB", progress: 68, done: false },
  ]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: Pending[] = Array.from(files).map((f, i) => ({
      id: `u${Date.now()}-${i}`,
      name: f.name,
      size: `${(f.size / 1024 / 1024).toFixed(2)} MB`,
      progress: 0,
      done: false,
    }));
    setQueue((q) => [...next, ...q]);
    next.forEach((n) => simulate(n.id));
  };

  const simulate = (id: string) => {
    const tick = () => {
      setQueue((q) =>
        q.map((i) => {
          if (i.id !== id || i.done) return i;
          const p = Math.min(100, i.progress + Math.random() * 22);
          return { ...i, progress: p, done: p >= 100 };
        }),
      );
    };
    const iv = setInterval(() => {
      tick();
      setQueue((q) => {
        const it = q.find((i) => i.id === id);
        if (it?.done) clearInterval(iv);
        return q;
      });
    }, 350);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold">Upload documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop your certificates, transcripts, letters, or project reports. AI will extract skills, dates, and entities automatically.
        </p>
      </header>

      <Card
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed p-12 text-center transition ${
          dragging ? "border-primary bg-primary/5 shadow-glow" : "border-border"
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elegant">
          <UploadCloud className="h-7 w-7" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold">Drop files here</p>
          <p className="text-sm text-muted-foreground">PDF, PNG, JPG, DOCX · Up to 25 MB</p>
        </div>
        <input
          ref={input}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <Button onClick={() => input.current?.click()} className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95">
          Choose files
        </Button>
      </Card>

      {queue.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">In progress</h2>
          <Card className="divide-y p-0">
            {queue.map((q) => (
              <div key={q.id} className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-medium">{q.name}</div>
                    <div className="flex flex-none items-center gap-2 text-xs text-muted-foreground">
                      {q.size}
                      {q.done ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <button onClick={() => setQueue((s) => s.filter((i) => i.id !== q.id))}>
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Progress value={q.progress} className="mt-2 h-1.5" />
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Library</h2>
        <Card className="divide-y p-0">
          {recentUploads.map((d) => (
            <div key={d.id} className="flex items-center gap-4 p-4 hover:bg-muted/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground">{d.type} · {d.size} · {d.uploaded}</div>
              </div>
              <div className="hidden gap-1.5 md:flex">
                {d.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
              </div>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}