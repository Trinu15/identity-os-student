import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search as SearchIcon, Sparkles, FileText, ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { aiSuggestions, recentUploads } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/search")({
  head: () => ({ meta: [{ title: "AI Search — IdentityOS" }] }),
  component: SearchPage,
});

function SearchPage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = (q: string) => {
    setQuery(q);
    setLoading(true);
    setAnswer(null);
    setTimeout(() => {
      setLoading(false);
      setAnswer(
        `Based on your 47 documents, here's what we found for "${q}":\n\nYou completed a Software Engineering internship at Stripe (Jun 2025) where you shipped a usage-metering pipeline. Related skills extracted: TypeScript, distributed systems, event processing. We also detected your AWS Cloud Practitioner certification (Nov 2025) and a Raft consensus research project (Jan 2025) that demonstrates infrastructure depth.`,
      );
    }, 700);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="text-center">
        <Badge variant="secondary" className="mb-3"><Sparkles className="mr-1 h-3 w-3" /> AI Search</Badge>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Ask anything about your identity</h1>
        <p className="mt-2 text-sm text-muted-foreground">Natural-language search across every document, skill, and milestone.</p>
      </header>

      <Card className="p-2 shadow-elegant">
        <form
          onSubmit={(e) => { e.preventDefault(); if (query.trim()) ask(query); }}
          className="flex items-center gap-2"
        >
          <SearchIcon className="ml-3 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What skills did I gain at my last internship?"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button type="submit" className="bg-gradient-primary text-primary-foreground hover:opacity-95">
            Ask <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </form>
      </Card>

      <div className="flex flex-wrap justify-center gap-2">
        {aiSuggestions.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      {loading && (
        <Card className="p-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 animate-pulse text-primary" />
            Thinking through your documents…
          </div>
        </Card>
      )}

      {answer && !loading && (
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium">IdentityOS AI</span>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{answer}</p>
          <div className="border-t pt-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Sources</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {recentUploads.slice(0, 4).map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm transition hover:border-primary">
                  <FileText className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1 truncate">{d.name}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}