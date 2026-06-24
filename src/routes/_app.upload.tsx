import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UploadCloud, FileText, X, CheckCircle2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/upload")({
  head: () => ({ meta: [{ title: "Upload — IdentityOS" }] }),
  component: UploadPage,
});

type Pending = { id: string; name: string; size: string; progress: number; done: boolean };
type DocRow = {
  id: string; name: string; doc_type: string; size_bytes: number;
  tags: string[]; created_at: string;
};

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function inferType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("transcript")) return "Transcript";
  if (n.includes("cert") || n.includes("certificate")) return "Certificate";
  if (n.includes("resume") || n.includes("cv")) return "Resume";
  if (n.includes("letter")) return "Letter";
  if (n.includes("project") || n.includes("report")) return "Project";
  return "Other";
}

function UploadPage() {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<Pending[]>([]);
  const [library, setLibrary] = useState<DocRow[]>([]);

  const refresh = async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("id, name, doc_type, size_bytes, tags, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setLibrary((data ?? []) as DocRow[]);
  };

  useEffect(() => { refresh(); }, []);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      toast.error("Please sign in to upload");
      return;
    }
    for (const file of Array.from(files)) {
      const pid = `u${Date.now()}-${Math.random()}`;
      setQueue((q) => [{ id: pid, name: file.name, size: fmtSize(file.size), progress: 10, done: false }, ...q]);
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      setQueue((q) => q.map((i) => i.id === pid ? { ...i, progress: 70 } : i));
      if (upErr) {
        toast.error(`Upload failed: ${upErr.message}`);
        setQueue((q) => q.filter((i) => i.id !== pid));
        continue;
      }
      const { error: insErr } = await supabase.from("documents").insert({
        user_id: userId,
        name: file.name,
        doc_type: inferType(file.name),
        size_bytes: file.size,
        storage_path: path,
        mime_type: file.type || null,
        tags: [],
      });
      if (insErr) {
        toast.error(insErr.message);
        setQueue((q) => q.filter((i) => i.id !== pid));
        continue;
      }
      setQueue((q) => q.map((i) => i.id === pid ? { ...i, progress: 100, done: true } : i));
      toast.success(`Uploaded ${file.name}`);
    }
    refresh();
  };

  const removeDoc = async (id: string, name: string) => {
    // Best-effort delete from storage too
    const { data: row } = await supabase.from("documents").select("storage_path").eq("id", id).maybeSingle();
    if (row?.storage_path) await supabase.storage.from("documents").remove([row.storage_path]);
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Removed ${name}`); refresh(); }
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
        {library.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            No documents yet. Upload your first one above.
          </Card>
        ) : (
          <Card className="divide-y p-0">
            {library.map((d) => (
              <div key={d.id} className="flex items-center gap-4 p-4 hover:bg-muted/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.doc_type} · {fmtSize(d.size_bytes)} · {new Date(d.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="hidden gap-1.5 md:flex">
                  {d.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeDoc(d.id, d.name)} aria-label="Delete">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}