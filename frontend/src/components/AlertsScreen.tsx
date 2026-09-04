import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileSearch, Loader2, ShieldAlert } from "lucide-react";

import {
  ApiError,
  getAlert,
  listAlerts,
  type Alert,
  type AlertDetailResult,
  type Customer,
  type Transaction,
} from "@/lib/api";
import { firedRules, money, outcomeTone, riskTone, ruleTypeLabel, shortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AlertsScreen({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AlertDetailResult | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const txnById = useMemo(
    () => new Map(transactions.map((t) => [Number(t.id), t])),
    [transactions],
  );
  const customerById = useMemo(
    () => new Map(customers.map((c) => [Number(c.id), c])),
    [customers],
  );

  function handle(err: unknown) {
    if (err instanceof ApiError && err.status === 401) return onUnauthorized();
    toast.error(err instanceof Error ? err.message : "Something went wrong.");
  }

  async function open(id: number) {
    setDetailId(id);
    try {
      setDetail(await getAlert(id));
    } catch (err) {
      handle(err);
    }
  }

  useEffect(() => {
    let deepLink: number | null = null;
    try {
      const raw = new URLSearchParams(window.location.search).get("alert");
      if (raw) deepLink = Number(raw);
    } catch {
      /* ignore */
    }
    (async () => {
      setLoading(true);
      try {
        const data = await listAlerts();
        setAlerts(data.alerts);
        setTransactions(data.transactions);
        setCustomers(data.customers);
        const first = deepLink ?? (data.alerts[0] ? Number(data.alerts[0].id) : null);
        if (first) void open(first);
      } catch (err) {
        handle(err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function partyFor(txn: Transaction | undefined): Customer | undefined {
    return txn ? customerById.get(Number(txn.customer_id)) : undefined;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Alert trail</CardTitle>
          <CardDescription>
            Every scored transaction, newest first. Each alert is pinned to the rule-set
            version that scored it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading alerts…
            </div>
          ) : alerts.length === 0 ? (
            <p className="text-muted-foreground py-8 text-sm">
              No alerts yet. Score a transaction, or reset the demo data.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => {
                  const txn = txnById.get(Number(a.transaction_id));
                  const party = partyFor(txn);
                  const selected = detailId === Number(a.id);
                  return (
                    <TableRow
                      key={String(a.id)}
                      onClick={() => open(Number(a.id))}
                      className={`cursor-pointer ${selected ? "bg-muted/60" : ""}`}
                    >
                      <TableCell className="font-medium">
                        {party ? String(party.name) : `Txn #${String(a.transaction_id)}`}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {txn ? money(txn.amount, txn.currency) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {String(a.total_score)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={outcomeTone(a.outcome)}>{String(a.outcome)}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        v{String(a.rule_set_version)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSearch className="text-muted-foreground size-4" />
            <CardTitle className="text-base">Alert evidence</CardTitle>
          </div>
          <CardDescription>The snapshotted rules that fired, and the transaction.</CardDescription>
        </CardHeader>
        <CardContent>
          {!detail ? (
            <p className="text-muted-foreground py-8 text-sm">
              Select an alert to see the exact rules that fired under its version.
            </p>
          ) : (
            <AlertDetail detail={detail} party={partyFor(asTxn(detail))} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function asTxn(detail: AlertDetailResult): Transaction {
  return detail.transaction as Transaction;
}

function AlertDetail({
  detail,
  party,
}: {
  detail: AlertDetailResult;
  party: Customer | undefined;
}) {
  const alert = detail.alert;
  const txn = detail.transaction;
  if (!alert || !txn) {
    return (
      <p className="text-muted-foreground text-sm">This alert has no evidence to show.</p>
    );
  }
  const rules = firedRules(alert.fired_rules);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-semibold tabular-nums">{String(alert.total_score)}</div>
          <div className="text-muted-foreground text-xs">total score</div>
        </div>
        <div className="text-right">
          <Badge variant={outcomeTone(alert.outcome)} className="mb-1">
            {String(alert.outcome)}
          </Badge>
          <div className="text-muted-foreground text-xs">
            rule set v{String(alert.rule_set_version)}
          </div>
        </div>
      </div>

      <div className="bg-muted/40 space-y-1 rounded-md p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Customer</span>
          <span className="font-medium">
            {party ? String(party.name) : "—"}
            {party ? (
              <Badge variant={riskTone(party.risk_rating)} className="ml-1.5 px-1.5 py-0 text-[10px]">
                {String(party.risk_rating)}
              </Badge>
            ) : null}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="tabular-nums">{money(txn.amount, txn.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Direction / channel</span>
          <span>
            {String(txn.direction)} · {String(txn.channel)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Counterparty country</span>
          <span className="font-mono">{String(txn.counterparty_country)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Booked</span>
          <span>{shortDate(txn.txn_timestamp)}</span>
        </div>
      </div>

      <div>
        <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase">
          <ShieldAlert className="size-3.5" /> Rules that fired ({rules.length})
        </div>
        {rules.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No rule fired — the transaction cleared under this version.
          </p>
        ) : (
          <div className="space-y-1.5">
            {rules.map((r) => (
              <div
                key={r.code}
                className="flex items-center justify-between rounded-md border px-2.5 py-1.5"
              >
                <div>
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-muted-foreground font-mono text-[11px]">
                    {r.code} · {ruleTypeLabel(r.rule_type)}
                  </div>
                </div>
                <Badge variant="outline" className="tabular-nums">
                  +{r.score_weight}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
      <Separator />
      <p className="text-muted-foreground text-xs">
        The rules above are a snapshot copied onto the alert at scoring time, so this evidence
        stays fixed even after the rules change in a later version.
      </p>
    </div>
  );
}
