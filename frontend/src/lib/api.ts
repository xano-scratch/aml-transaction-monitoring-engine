// The one contract: paths and request/response *types* are derived from the
// xanots query defs — never a hand-typed URL or request body. Change a def and
// everything here follows.
import type { InferResponse } from "@xanots/sdk";

import { authLogin } from "../../../xano/api/auth-login.js";
import { txnList } from "../../../xano/api/txn-list.js";
import { txnIngest } from "../../../xano/api/txn-ingest.js";
import { scoreRun } from "../../../xano/api/score-run.js";
import { alertsList } from "../../../xano/api/alerts-list.js";
import { alertsDetail } from "../../../xano/api/alerts-detail.js";
import { rulesetsList } from "../../../xano/api/rulesets-list.js";
import { rulesetsDraft } from "../../../xano/api/rulesets-draft.js";
import { rulesetsRuleUpdate } from "../../../xano/api/rulesets-rule-update.js";
import { rulesetsActivate } from "../../../xano/api/rulesets-activate.js";
import { seedReset } from "../../../xano/api/seed-reset.js";

/** The deployed backend's base URL — injected as window.XANO_HOST by `xanots deploy --static`. */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Bearer token, held for the session ──────────────────────────────────────
const TOKEN_KEY = "aml_token";
let authToken: string | null =
  typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

export function setToken(token: string | null): void {
  authToken = token;
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getToken(): string | null {
  return authToken;
}

type CallOpts = { method: string; body?: unknown; auth?: boolean };

async function call<T>(path: string, opts: CallOpts): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.auth && authToken) headers["authorization"] = `Bearer ${authToken}`;
  const res = await fetch(XANO_HOST + path, {
    method: opts.method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data && typeof data.message === "string") message = data.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ── Response types, derived from the defs ────────────────────────────────────
export type LoginResult = InferResponse<typeof authLogin>;
export type SessionUser = LoginResult["user"];

export type TxnListResult = InferResponse<typeof txnList>;
export type Transaction = TxnListResult["transactions"][number];
export type Customer = TxnListResult["customers"][number];

export type Alert = InferResponse<typeof alertsList>["alerts"][number];
export type AlertDetailResult = InferResponse<typeof alertsDetail>;

export type RulesetsListResult = InferResponse<typeof rulesetsList>;
export type RuleSet = RulesetsListResult["rule_sets"][number];
export type Rule = RulesetsListResult["rules"][number];

/** The one field the typechecker can't see into: the snapshotted rules on an alert are a json column. */
export type FiredRule = {
  code: string;
  name: string;
  rule_type: string;
  score_weight: number;
};

// ── Typed calls ──────────────────────────────────────────────────────────────
export function login(email: string, password: string) {
  return call<LoginResult>(authLogin.getPath(), {
    method: authLogin.verb,
    body: { email, password },
  });
}

export function listTransactions() {
  return call<TxnListResult>(txnList.getPath(), { method: txnList.verb, auth: true });
}

export type IngestBody = {
  customer_id: number;
  amount: number;
  currency: string;
  direction: string;
  counterparty_country: string;
  channel: string;
};
export function ingestTransaction(body: IngestBody) {
  return call<Transaction>(txnIngest.getPath(), {
    method: txnIngest.verb,
    body,
    auth: true,
  });
}

export function runScoring(transaction_id: number) {
  return call<Alert>(scoreRun.getPath(), {
    method: scoreRun.verb,
    body: { transaction_id },
    auth: true,
  });
}

export function listAlerts() {
  return call<InferResponse<typeof alertsList>>(alertsList.getPath(), {
    method: alertsList.verb,
    auth: true,
  });
}

export function getAlert(alert_id: number) {
  return call<AlertDetailResult>(alertsDetail.getPath({ params: { alert_id } }), {
    method: alertsDetail.verb,
    auth: true,
  });
}

export function listRuleSets() {
  return call<RulesetsListResult>(rulesetsList.getPath(), {
    method: rulesetsList.verb,
    auth: true,
  });
}

export function draftFromActive() {
  return call<{ rule_set: RuleSet; rules: Rule[] }>(rulesetsDraft.getPath(), {
    method: rulesetsDraft.verb,
    auth: true,
  });
}

export type RuleUpdateBody = {
  rule_id: number;
  param_number: number;
  score_weight: number;
  enabled: boolean;
};
export function updateRule(body: RuleUpdateBody) {
  return call<Rule>(rulesetsRuleUpdate.getPath(), {
    method: rulesetsRuleUpdate.verb,
    body,
    auth: true,
  });
}

export function activateVersion(rule_set_id: number) {
  return call<RuleSet>(rulesetsActivate.getPath(), {
    method: rulesetsActivate.verb,
    body: { rule_set_id },
    auth: true,
  });
}

/** Public bootstrap — truncate + reinstall the demo fixture + score everything. */
export function resetDemoData() {
  return call<{ ok: boolean; alerts: number }>(seedReset.getPath(), {
    method: seedReset.verb,
  });
}
