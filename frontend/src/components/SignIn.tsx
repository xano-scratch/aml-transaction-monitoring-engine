import { useState } from "react";
import { toast } from "sonner";
import { DatabaseZap, Loader2, ShieldCheck } from "lucide-react";

import { login, resetDemoData, type LoginResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const DEMO_USERS = [
  {
    role: "admin",
    name: "Maria Chen",
    email: "maria@aml.example",
    password: "admin-demo",
    blurb: "Authors rules and activates new versions.",
  },
  {
    role: "analyst",
    name: "Sam Rivera",
    email: "sam@aml.example",
    password: "analyst-demo",
    blurb: "Clones and edits draft rules.",
  },
  {
    role: "viewer",
    name: "Lee Park",
    email: "lee@aml.example",
    password: "viewer-demo",
    blurb: "Reads alerts, cannot edit.",
  },
] as const;

export function SignIn({ onSignedIn }: { onSignedIn: (result: LoginResult) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function doLogin(em: string, pw: string) {
    if (!em || !pw) {
      toast.error("Enter an email and password.");
      return;
    }
    setBusy(em);
    try {
      onSignedIn(await login(em, pw));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(null);
    }
  }

  async function seed() {
    setSeeding(true);
    try {
      const r = await resetDemoData();
      toast.success(`Demo data loaded — ${r.alerts} alerts scored. Sign in above.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load demo data.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 p-6">
      <div className="space-y-3 text-center">
        <div className="text-primary inline-flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="size-5" />
          AML Transaction-Monitoring Rules Engine
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          One governed rule set screens every transaction the same way.
        </h1>
        <p className="text-muted-foreground mx-auto max-w-xl text-sm">
          Post a transaction and get back its risk score, the exact versioned rules that
          fired, and a queryable alert trail. Access is enforced at the API layer by role,
          never with row-level security.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {DEMO_USERS.map((u) => (
          <Card key={u.email} className="flex flex-col">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{u.name}</CardTitle>
                <Badge variant={u.role === "viewer" ? "outline" : "secondary"}>{u.role}</Badge>
              </div>
              <CardDescription>{u.blurb}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button
                className="w-full"
                variant={u.role === "admin" ? "default" : "secondary"}
                disabled={busy !== null}
                onClick={() => doLogin(u.email, u.password)}
              >
                {busy === u.email ? <Loader2 className="size-4 animate-spin" /> : null}
                Sign in as {u.role}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sign in manually</CardTitle>
          <CardDescription>Any of the seeded accounts above works.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void doLogin(email, password);
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="maria@aml.example"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="admin-demo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy !== null}>
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-muted-foreground flex flex-col items-center gap-2 text-center text-xs">
        <Button variant="outline" size="sm" onClick={seed} disabled={seeding}>
          {seeding ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <DatabaseZap className="size-4" />
          )}
          Reset demo data
        </Button>
        <p>
          Loads five customers, seven transactions, one active rule set, and the three role
          accounts, then scores every transaction. Use it if sign-in cannot find the seeded
          users.
        </p>
      </div>
    </main>
  );
}
