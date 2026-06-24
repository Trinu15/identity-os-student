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
import { profile, skills, stats } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — IdentityOS" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <div className="space-y-8">
      {/* Header card */}
      <Card className="overflow-hidden p-0">
        <div className="h-32 bg-gradient-primary bg-mesh" />
        <div className="flex flex-col gap-4 px-6 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <Avatar className="-mt-12 h-24 w-24 ring-4 ring-background shadow-elegant">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback>{profile.name.split(" ").map(p => p[0]).join("")}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-semibold">{profile.name}</h1>
                <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3 text-primary" /> Verified</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {profile.email}</span>
                <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {profile.program}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {profile.university}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined {profile.joined}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Share profile</Button>
            <Button className="bg-gradient-primary text-primary-foreground hover:opacity-95">Edit profile</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* About + form */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold">About</h2>
            <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold">Account settings</h2>
            <Separator className="my-4" />
            <form className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fname">Full name</Label>
                <Input id="fname" defaultValue={profile.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sid">Student ID</Label>
                <Input id="sid" defaultValue={profile.studentId} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" defaultValue={profile.bio} rows={4} />
              </div>
              <div className="flex sm:col-span-2 sm:justify-end">
                <Button className="bg-gradient-primary text-primary-foreground hover:opacity-95">Save changes</Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">At a glance</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <div key={s.key} className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="font-display text-xl font-semibold">{s.value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Skills</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <Badge key={s.name} variant="secondary">{s.name}</Badge>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}