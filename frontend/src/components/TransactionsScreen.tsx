import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Play, Plus } from "lucide-react";

import {
  ApiError,
  ingestTransaction,
  listTransactions,
  runScoring,
  type Alert,
  type Customer,
  type IngestBody,
  type Transaction,
} from "@/lib/api";
import { firedRules, money, outcomeTone, riskTone, ruleTypeLabel } from "@/lib/format";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "CHF", "SGD"];
const CHANNELS = ["wire", "card", "ach", "internal"];

const EMPTY_FORM = {
  customer_id: "",
  amount: "",
  currency: "USD",
  direction: "debit",
  counterparty_country: "",
  channel: "wire",
};

export function TransactionsScreen({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoringId, setScoringId] = useState<number | null>(null);
  const [result, setResult] = useState<{ txn: Transaction; alert: Alert } | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const customerById = useMemo(
    () => new Map(customers.map((c) => [Number(c.id), c])),
    [customers],
  );

  async function load() {
    setLoading(true);
    try {
      const data = await listTransactions();
      setTransactions(data.transactions);
      setCustomers(data.customers);
    } catch (err) {
      handle(err);
    } finally {
      setLoading(false);
    }
  }

  function handle(err: unknown) {
    if (err instanceof ApiError && err.status === 401) return onUnauthorized();
    toast.error(err instanceof Error ? err.message : "Something went wrong.");
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function score(txn: Transaction) {
    setScoringId(Number(txn.id));
    try {
      const alert = await runScoring(Number(txn.id));
      setResult({ txn, alert });
      toast.success(`Scored transaction #${txn.id}: ${alert.outcome} (${alert.total_score}).`);
    } catch (err) {
      handle(err);
    } finally {
      setScoringId(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const customerId = Number(form.customer_id);
    const amount = Number(form.amount);
    if (!customerId) return toast.error("Choose a customer.");
    if (!(amount > 0)) return toast.error("Amount must be greater than zero.");
    if (!form.counterparty_country.trim()) return toast.error("Enter a counterparty country.");
    setSubmitting(true);
    try {
      const body: IngestBody = {
        customer_id: customerId,
        amount,
        currency: form.currency,
        direction: form.direction,
        counterparty_country: form.counterparty_country.trim().toUpperCase(),
        channel: form.channel,
      };
      const txn = await ingestTransaction(body);
      const alert = await runScoring(Number(txn.id));
      setResult({ txn, alert });
      setForm({ ...EMPTY_FORM });
      toast.success(`Ingested and scored: ${alert.outcome} (${alert.total_score}).`);
      void load();
    } catch (err) {
      handle(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            Screen any transaction against the active rule set. Re-scoring writes a new alert,
            so the version trail stays visible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading transactions…
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-muted-foreground py-8 text-sm">
              No transactions yet. Reset the demo data or ingest one on the right.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => {
                  const cust = customerById.get(Number(txn.customer_id));
                  return (
                    <TableRow key={String(txn.id)}>
                      <TableCell>
                        <div className="font-medium">{cust ? String(cust.name) : "—"}</div>
                        <div className="text-muted-foreground text-xs">
                          {cust ? String(cust.country) : ""}
                          {cust ? (
                            <Badge
                              variant={riskTone(cust.risk_rating)}
                              className="ml-1.5 px-1.5 py-0 text-[10px]"
                            >
                              {String(cust.risk_rating)}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(txn.amount, txn.currency)}
                        <div className="text-muted-foreground text-xs">{String(txn.direction)}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {String(txn.counterparty_country)}
                      </TableCell>
                      <TableCell className="text-xs">{String(txn.channel)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={scoringId !== null}
                          onClick={() => score(txn)}
                        >
                          {scoringId === Number(txn.id) ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Play className="size-3.5" />
                          )}
                          Score
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        {result ? (
          <Card className="border-primary/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Scoring result</CardTitle>
                <Badge variant={outcomeTone(result.alert.outcome)}>
                  {String(result.alert.outcome)}
                </Badge>
              </div>
              <CardDescription>
                Transaction #{String(result.txn.id)} ·{" "}
                {money(result.txn.amount, result.txn.currency)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-4">
                <div>
                  <div className="text-3xl font-semibold tabular-nums">
                    {String(result.alert.total_score)}
                  </div>
                  <div className="text-muted-foreground text-xs">total score</div>
                </div>
                <div>
                  <div className="text-xl font-medium tabular-nums">
                    v{String(result.alert.rule_set_version)}
                  </div>
                  <div className="text-muted-foreground text-xs">rule-set version</div>
                </div>
              </div>
              <Separator />
              <div className="space-y-1.5">
                <div className="text-muted-foreground text-xs font-medium uppercase">
                  Rules that fired
                </div>
                {firedRules(result.alert.fired_rules).length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No rule fired. The transaction cleared.
                  </p>
                ) : (
                  firedRules(result.alert.fired_rules).map((r) => (
                    <div
                      key={r.code}
                      className="bg-muted/50 flex items-center justify-between rounded-md px-2.5 py-1.5"
                    >
                      <div>
                        <div className="text-sm font-medium">{r.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {ruleTypeLabel(r.rule_type)}
                        </div>
                      </div>
                      <Badge variant="outline" className="tabular-nums">
                        +{r.score_weight}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingest a transaction</CardTitle>
            <CardDescription>Persist it, then score it against the active rules.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select
                  value={form.customer_id}
                  onValueChange={(v) => setForm({ ...form, customer_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={String(c.id)} value={String(c.id)}>
                        {String(c.name)} · {String(c.country)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="9500"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(v) => setForm({ ...form, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Direction</Label>
                  <Select
                    value={form.direction}
                    onValueChange={(v) => setForm({ ...form, direction: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">debit</SelectItem>
                      <SelectItem value="credit">credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Channel</Label>
                  <Select
                    value={form.channel}
                    onValueChange={(v) => setForm({ ...form, channel: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Counterparty country</Label>
                <Input
                  id="country"
                  placeholder="RU"
                  maxLength={2}
                  value={form.counterparty_country}
                  onChange={(e) =>
                    setForm({ ...form, counterparty_country: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Ingest &amp; score
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
