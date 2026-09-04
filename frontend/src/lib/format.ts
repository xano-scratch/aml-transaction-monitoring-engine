import type { FiredRule } from "./api";

/** Format a numeric amount with thousands separators and its currency code. */
export function money(amount: unknown, currency?: unknown): string {
  const n = Number(amount);
  const formatted = Number.isFinite(n) ? n.toLocaleString("en-US") : String(amount ?? "");
  return currency ? `${formatted} ${currency}` : formatted;
}

/** The snapshotted fired-rules json on an alert, read as a typed array. */
export function firedRules(value: unknown): FiredRule[] {
  if (Array.isArray(value)) return value as FiredRule[];
  return [];
}

export type BadgeTone = "default" | "secondary" | "destructive" | "outline";

export function outcomeTone(outcome: unknown): BadgeTone {
  return outcome === "alert" ? "destructive" : "secondary";
}

export function statusTone(status: unknown): BadgeTone {
  if (status === "active") return "default";
  if (status === "draft") return "secondary";
  return "outline"; // retired
}

export function riskTone(risk: unknown): BadgeTone {
  if (risk === "high") return "destructive";
  if (risk === "medium") return "secondary";
  return "outline";
}

const RULE_TYPE_LABEL: Record<string, string> = {
  amount_threshold: "Amount threshold",
  high_risk_country: "High-risk country",
  structuring: "Structuring",
  high_risk_customer: "High-risk customer",
};
export function ruleTypeLabel(t: unknown): string {
  return RULE_TYPE_LABEL[String(t)] ?? String(t ?? "");
}

/** A short epoch-ms timestamp for display. */
export function shortDate(epochms: unknown): string {
  const n = Number(epochms);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const d = new Date(n);
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}
