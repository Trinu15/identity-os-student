import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, GraduationCap, Calendar, ShieldCheck } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — IdentityOS" }] }),
  component: ProfilePage,
});

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  university: string | null;
  program: string | null;
  student_id: string | null;
  avatar_url: string | null;
  created_at: string;
};

function ProfilePage() {
  const [p, setP] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState({
    documents: 0, skills: 0, projects: 0, certifications: 0, internships: 0, achievements: 0,
  });
  const [skillList, setSkillList] = useState<{ name: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      setP(data as ProfileRow | null);
      const tables = ["documents", "skills", "projects", "certifications", "internships", "achievements"] as const;
      const results = await Promise.all(
        tables.map((t) => supabase.from(t).select("*", { count: "exact", head: true })),
      );
      setCounts({
        documents: results[0].count ?? 0,
        skills: results[1].count ?? 0,
        projects: results[2].count ?? 0,
        certifications: results[3].count ?? 0,
        internships: results[4].count ?? 0,
        achievements: results[5].count ?? 0,
      });
      const { data: sk } = await supabase.from("skills").select("name").limit(40);
      setSkillList(sk ?? []);
    };
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!p) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      name: p.name, bio: p.bio, university: p.university, program: p.program, student_id: p.student_id, avatar_url: p.avatar_url,
    }).eq("id", p.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  if (!p) return <div className="text-sm text-muted-foreground">Loading profile…</div>;

  const displayName = p.name || p.email?.split("@")[0] || "Student";
  const initials = displayName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const statTiles = [
    { label: "Documents", value: counts.documents },
    { label: "Skills", value: counts.skills },
    { label: "Certifications", value: counts.certifications },
    { label: "Projects", value: counts.projects },
    { label: "Internships", value: counts.internships },
    { label: "Achievements", value: counts.achievements },
  ];

  return (
    <div className="space-y-8">
      {/* Header card */}
      <Card className="overflow-hidden p-0">
        <div className="h-32 bg-gradient-primary bg-mesh" />
        <div className="flex flex-col gap-4 px-6 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <Avatar className="-mt-12 h-24 w-24 ring-4 ring-background shadow-elegant">
              {p.avatar_url && <AvatarImage src={p.avatar_url} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-semibold">{displayName}</h1>
                <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3 text-primary" /> Verified</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {p.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {p.email}</span>}
                {p.program && <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {p.program}</span>}
                {p.university && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {p.university}</span>}
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined {new Date(p.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* About + form */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold">About</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.bio || "Add a short bio to tell the world about your work."}</p>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold">Profile settings</h2>
            <Separator className="my-4" />
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
              <div className="space-y-2">
                <Label htmlFor="fname">Full name</Label>
                <Input id="fname" value={p.name ?? ""} onChange={(e) => setP({ ...p, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sid">Student ID</Label>
                <Input id="sid" value={p.student_id ?? ""} onChange={(e) => setP({ ...p, student_id: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                <Input id="university" value={p.university ?? ""} onChange={(e) => setP({ ...p, university: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program">Program</Label>
                <Input id="program" value={p.program ?? ""} onChange={(e) => setP({ ...p, program: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input id="avatar" value={p.avatar_url ?? ""} onChange={(e) => setP({ ...p, avatar_url: e.target.value })} placeholder="https://…" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" value={p.bio ?? ""} onChange={(e) => setP({ ...p, bio: e.target.value })} rows={4} />
              </div>
              <div className="flex sm:col-span-2 sm:justify-end">
                <Button type="submit" disabled={saving} className="bg-gradient-primary text-primary-foreground hover:opacity-95">
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">At a glance</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {statTiles.map((s) => (
                <div key={s.label} className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="font-display text-xl font-semibold">{s.value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Skills</h3>
            {skillList.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No skills yet — they'll appear here as AI extracts them from your documents.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {skillList.map((s) => (
                  <Badge key={s.name} variant="secondary">{s.name}</Badge>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}