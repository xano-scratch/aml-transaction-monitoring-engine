import { useState } from "react";
import { toast } from "sonner";
import { DatabaseZap, LogOut, ShieldCheck } from "lucide-react";

import {
  getToken,
  loadStoredUser,
  resetDemoData,
  setToken,
  storeUser,
  type LoginResult,
} from "@/lib/api";
import { SignIn } from "@/components/SignIn";
import { TransactionsScreen } from "@/components/TransactionsScreen";
import { AlertsScreen } from "@/components/AlertsScreen";
import { RuleSetsScreen } from "@/components/RuleSetsScreen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Session = { id: number; email: string; name: string; role: string };

function initialTab(): string {
  try {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "alerts" || t === "rulesets") return t;
  } catch {
    /* ignore */
  }
  return "transactions";
}

export default function App() {
  const [session, setSession] = useState<Session | null>(
    () => (getToken() ? loadStoredUser() : null),
  );
  const [tab, setTab] = useState<string>(initialTab());
  const [resetting, setResetting] = useState(false);

  function onSignedIn(result: LoginResult) {
    const user = result.user as { id: unknown; email: unknown; name: unknown; role: unknown };
    const session: Session = {
      id: Number(user.id),
      email: String(user.email),
      name: String(user.name),
      role: String(user.role),
    };
    setToken(String((result as { token: unknown }).token));
    storeUser(session);
    setSession(session);
  }

  function signOut() {
    setToken(null);
    storeUser(null);
    setSession(null);
  }

  async function resetDemo() {
    setResetting(true);
    try {
      const r = await resetDemoData();
      toast.success(`Demo data reset — ${r.alerts} alerts scored. Reloading…`);
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed.");
      setResetting(false);
    }
  }

  if (!session) {
    return (
      <>
        <SignIn onSignedIn={onSignedIn} />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-card/60 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">AML Monitoring Engine</div>
              <div className="text-muted-foreground text-xs">
                Business logic centralization · Banking
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium leading-tight">{session.name}</div>
              <div className="text-muted-foreground text-xs">{session.email}</div>
            </div>
            <Badge variant={session.role === "viewer" ? "outline" : "secondary"}>
              {session.role}
            </Badge>
            <Button variant="outline" size="sm" onClick={resetDemo} disabled={resetting}>
              <DatabaseZap className="size-4" /> Reset demo
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-4" /> Switch user
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="rulesets">Rule sets</TabsTrigger>
          </TabsList>
          <TabsContent value="transactions">
            <TransactionsScreen onUnauthorized={signOut} />
          </TabsContent>
          <TabsContent value="alerts">
            <AlertsScreen onUnauthorized={signOut} />
          </TabsContent>
          <TabsContent value="rulesets">
            <RuleSetsScreen role={session.role} onUnauthorized={signOut} />
          </TabsContent>
        </Tabs>
      </main>

      <Toaster />
    </div>
  );
}
