import { createFileRoute } from "@tanstack/react-router";
import {
  Award,
  Briefcase,
  Code2,
  GraduationCap,
  Trophy,
} from "lucide-react";
import type { ComponentType } from "react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeline, type TimelineItem } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/timeline")({
  head: () => ({ meta: [{ title: "Digital Timeline — IdentityOS" }] }),
  component: TimelinePage,
});

const meta: Record<TimelineItem["type"], { icon: ComponentType<{ className?: string }>; tone: string; label: string }> = {
  education: { icon: GraduationCap, tone: "var(--color-chart-2)", label: "Education" },
  internship: { icon: Briefcase, tone: "var(--color-chart-3)", label: "Internship" },
  project: { icon: Code2, tone: "var(--color-chart-4)", label: "Project" },
  certification: { icon: Award, tone: "var(--color-accent)", label: "Certification" },
  award: { icon: Trophy, tone: "var(--color-chart-5)", label: "Award" },
};

function TimelinePage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold">Digital timeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every milestone in your academic and professional journey.</p>
      </header>

      <div className="relative">
        <div className="absolute bottom-0 left-5 top-0 w-px bg-border md:left-1/2" />
        <ul className="space-y-8">
          {timeline.map((item, i) => {
            const m = meta[item.type];
            const Icon = m.icon;
            const right = i % 2 === 1;
            return (
              <li key={item.id} className="relative md:grid md:grid-cols-2 md:gap-8">
                {/* node */}
                <div className="absolute left-5 top-3 -translate-x-1/2 md:left-1/2">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full border-4 shadow-elegant"
                    style={{ background: m.tone, borderColor: "var(--color-background)" }}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className={`pl-14 md:pl-0 ${right ? "md:col-start-2 md:pl-12" : "md:pr-12 md:text-right"}`}>
                  <Card className="p-5 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{m.label}</Badge>
                      <span className="text-xs text-muted-foreground">{item.date}</span>
                    </div>
                    <h3 className="mt-2 font-display text-lg font-semibold">{item.title}</h3>
                    <div className="text-sm text-primary">{item.org}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                  </Card>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}