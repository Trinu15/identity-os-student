import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, GraduationCap, ShieldCheck, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IdentityOS — Your AI-powered digital identity" },
      { name: "description", content: "IdentityOS turns your certificates, projects, and milestones into a searchable, AI-powered student identity." },
      { property: "og:title", content: "IdentityOS" },
      { property: "og:description", content: "AI-powered digital identity system for students." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(signInData);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signUpData.email,
      password: signUpData.password,
      options: {
        data: { name: signUpData.name },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. Welcome to IdentityOS!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-primary p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="relative flex items-center gap-2 text-primary-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-semibold">IdentityOS</span>
        </div>

        <div className="relative space-y-6 text-primary-foreground">
          <h1 className="font-display text-4xl font-semibold leading-tight xl:text-5xl">
            Your academic life,<br />understood by AI.
          </h1>
          <p className="max-w-md text-base/relaxed text-primary-foreground/80">
            One verified identity for every certificate, internship, project, and skill — searchable, shareable, and yours forever.
          </p>
          <div className="grid max-w-md gap-3">
            {[
              { icon: GraduationCap, t: "Auto-extract skills from documents" },
              { icon: Network, t: "Visualize your knowledge graph" },
              { icon: ShieldCheck, t: "Cryptographically verified records" },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 p-3 backdrop-blur">
                <f.icon className="h-5 w-5" />
                <span className="text-sm">{f.t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-primary-foreground/60">
          Trusted by students at IIT, NIT, BITS, IIIT and 120+ campuses.
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md border-border/60 p-8 shadow-elegant">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold">IdentityOS</span>
          </div>
          <h2 className="font-display text-2xl font-semibold">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your student identity.</p>

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@university.edu" required
                    value={signInData.email}
                    onChange={(e) => setSignInData((s) => ({ ...s, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required
                    value={signInData.password}
                    onChange={(e) => setSignInData((s) => ({ ...s, password: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" placeholder="Aarav Mehta" required
                    value={signUpData.name}
                    onChange={(e) => setSignUpData((s) => ({ ...s, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">Student email</Label>
                  <Input id="email2" type="email" placeholder="you@university.edu" required
                    value={signUpData.email}
                    onChange={(e) => setSignUpData((s) => ({ ...s, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password2">Password</Label>
                  <Input id="password2" type="password" required minLength={6}
                    value={signUpData.password}
                    onChange={(e) => setSignUpData((s) => ({ ...s, password: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95" disabled={loading}>
                  {loading ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <Link to="/" className="underline-offset-4 hover:underline">terms</Link>.
          </p>
        </Card>
      </div>
    </div>
  );
}
