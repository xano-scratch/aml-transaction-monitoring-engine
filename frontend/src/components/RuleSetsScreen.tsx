import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, GitBranch, Loader2, Pencil } from "lucide-react";

import {
  activateVersion,
  ApiError,
  draftFromActive,
  listRuleSets,
  updateRule,
  type Rule,
  type RuleSet,
} from "@/lib/api";
import { money, ruleTypeLabel, statusTone } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EditForm = { param_number: string; score_weight: string; enabled: boolean };

export function RuleSetsScreen({
  role,
  onUnauthorized,
}: {
  role: string;
  onUnauthorized: () => void;
}) {
  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    param_number: "",
    score_weight: "",
    enabled: true,
  });

  const canAuthor = role === "admin" || role === "analyst";
  const canActivate = role === "admin";

  const rulesBySet = useMemo(() => {
    const map = new Map<number, Rule[]>();
    for (const r of rules) {
      const key = Number(r.rule_set_id);
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return map;
  }, [rules]);

  function handle(err: unknown) {
    if (err instanceof ApiError && err.status === 401) return onUnauthorized();
    toast.error(err instanceof Error ? err.message : "Something went wrong.");
  }

  async function load() {
    setLoading(true);
    try {
      const data = await listRuleSets();
      setRuleSets(data.rule_sets);
      setRules(data.rules);
    } catch (err) {
      handle(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function clone() {
    setBusy(true);
    try {
      const res = await draftFromActive();
      toast.success(`Cloned the active set into draft v${res.rule_set.version}.`);
      await load();
    } catch (err) {
      handle(err);
    } finally {
      setBusy(false);
    }
  }

  async function activate(set: RuleSet) {
    setBusy(true);
    try {
      await activateVersion(Number(set.id));
      toast.success(`Version ${String(set.version)} is now active.`);
      await load();
    } catch (err) {
      handle(err);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(rule: Rule) {
    setEditingId(Number(rule.id));
    setEditForm({
      param_number: rule.param_number == null ? "0" : String(rule.param_number),
      score_weight: String(rule.score_weight),
      enabled: Boolean(rule.enabled),
    });
  }

  async function saveEdit(rule: Rule) {
    setBusy(true);
    try {
      await updateRule({
        rule_id: Number(rule.id),
        param_number: Number(editForm.param_number),
        score_weight: Number(editForm.score_weight),
        enabled: editForm.enabled,
      });
      toast.success(`Rule ${String(rule.code)} updated.`);
      setEditingId(null);
      await load();
    } catch (err) {
      handle(err);
    } finally {
      setBusy(false);
    }
  }

  const hasDraft = ruleSets.some((s) => s.status === "draft");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Rule sets</CardTitle>
              <CardDescription>
                Rules are versioned data, not code. Clone the active set into a draft, tighten
                a rule, then activate it. Every alert cites the version that scored it.
              </CardDescription>
            </div>
            {canAuthor ? (
              <Button onClick={clone} disabled={busy || hasDraft}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GitBranch className="size-4" />
                )}
                Clone active to draft
              </Button>
            ) : null}
          </div>
        </CardHeader>
        {!canAuthor ? (
          <CardContent>
            <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
              You are signed in as a viewer. Authoring is enforced at the API layer, so the
              clone, edit, and activate actions are hidden and would be refused. Sign in as an
              analyst or admin to author rules.
            </p>
          </CardContent>
        ) : hasDraft ? (
          <CardContent>
            <p className="text-muted-foreground text-sm">
              A draft exists below. Edit its rules, then{" "}
              {canActivate ? "activate it" : "ask an admin to activate it"}.
            </p>
          </CardContent>
        ) : null}
      </Card>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" /> Loading rule sets…
        </div>
      ) : (
        ruleSets.map((set) => {
          const setRules = rulesBySet.get(Number(set.id)) ?? [];
          const isDraft = set.status === "draft";
          const editable = isDraft && canAuthor;
          return (
            <Card key={String(set.id)} className={isDraft ? "border-primary/40" : undefined}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">Version {String(set.version)}</CardTitle>
                    <Badge variant={statusTone(set.status)}>{String(set.status)}</Badge>
                    <span className="text-muted-foreground text-sm">{String(set.note)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      alert at ≥ {String(set.alert_threshold)} · {setRules.length} rules
                    </span>
                    {isDraft && canActivate ? (
                      <Button size="sm" onClick={() => activate(set)} disabled={busy}>
                        <CheckCircle2 className="size-3.5" /> Activate
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Parameter</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead>Enabled</TableHead>
                      {editable ? <TableHead className="text-right">Edit</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {setRules.map((rule) => {
                      const editing = editingId === Number(rule.id);
                      return (
                        <TableRow key={String(rule.id)}>
                          <TableCell>
                            <div className="font-medium">{String(rule.name)}</div>
                            <div className="text-muted-foreground font-mono text-[11px]">
                              {String(rule.code)}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{ruleTypeLabel(rule.rule_type)}</TableCell>
                          <TableCell className="text-sm">
                            {editing ? (
                              <Input
                                type="number"
                                className="h-8 w-28"
                                value={editForm.param_number}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, param_number: e.target.value })
                                }
                              />
                            ) : (
                              <RuleParameter rule={rule} />
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {editing ? (
                              <Input
                                type="number"
                                className="h-8 w-20"
                                value={editForm.score_weight}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, score_weight: e.target.value })
                                }
                              />
                            ) : (
                              String(rule.score_weight)
                            )}
                          </TableCell>
                          <TableCell>
                            {editing ? (
                              <Switch
                                checked={editForm.enabled}
                                onCheckedChange={(v) => setEditForm({ ...editForm, enabled: v })}
                              />
                            ) : (
                              <Badge variant={rule.enabled ? "secondary" : "outline"}>
                                {rule.enabled ? "on" : "off"}
                              </Badge>
                            )}
                          </TableCell>
                          {editable ? (
                            <TableCell className="text-right">
                              {editing ? (
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingId(null)}
                                    disabled={busy}
                                  >
                                    Cancel
                                  </Button>
                                  <Button size="sm" onClick={() => saveEdit(rule)} disabled={busy}>
                                    Save
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEdit(rule)}
                                  disabled={busy}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              )}
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function RuleParameter({ rule }: { rule: Rule }) {
  if (rule.rule_type === "amount_threshold") {
    return <span className="tabular-nums">≥ {money(rule.param_number)}</span>;
  }
  if (rule.rule_type === "structuring") {
    return <span className="tabular-nums">just under {money(rule.param_number)}</span>;
  }
  if (rule.rule_type === "high_risk_country") {
    return <span className="font-mono text-xs">{String(rule.param_text ?? "—")}</span>;
  }
  return <span className="text-muted-foreground">risk_rating = high</span>;
}
