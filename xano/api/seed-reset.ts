import { query, s, ref, c } from "@xanots/sdk";
import { aml } from "./aml.js";
import { users } from "../tables/users.js";
import { customers } from "../tables/customers.js";
import { transactions } from "../tables/transactions.js";
import { ruleSets } from "../tables/rule-sets.js";
import { monitoringRules } from "../tables/monitoring-rules.js";
import { alerts } from "../tables/alerts.js";
import { scoreTransaction } from "../functions/score-transaction.js";

// ── The demo fixture ────────────────────────────────────────────────────────
// After a truncate-with-reset the id sequences restart at 1, so the ids below
// (customer_id 1..5, rule_set_id 1) are deterministic. Passwords are plaintext
// demo credentials; the f.password column hashes them on write.

const SEED_USERS = [
  { email: "maria@aml.example", password: "admin-demo", name: "Maria Chen", role: "admin" },
  { email: "sam@aml.example", password: "analyst-demo", name: "Sam Rivera", role: "analyst" },
  { email: "lee@aml.example", password: "viewer-demo", name: "Lee Park", role: "viewer" },
] as const;

const SEED_CUSTOMERS = [
  { name: "Volkov Trading", country: "RU", risk_rating: "high" },
  { name: "Meridian Imports", country: "AE", risk_rating: "medium" },
  { name: "Blue Harbor LLC", country: "US", risk_rating: "low" },
  { name: "Sahel Freight", country: "SY", risk_rating: "high" },
  { name: "Nordwind GmbH", country: "DE", risk_rating: "low" },
] as const;

const SEED_RULE_SETS = [
  {
    version: 1,
    status: "active",
    note: "Baseline AML monitoring rules",
    alert_threshold: 50,
    activated_at: 1755648000000,
  },
] as const;

const SEED_RULES = [
  {
    rule_set_id: 1,
    code: "AMT_THRESHOLD",
    name: "Large transaction",
    rule_type: "amount_threshold",
    param_number: 10000,
    score_weight: 40,
    enabled: true,
  },
  {
    rule_set_id: 1,
    code: "HIGH_RISK_COUNTRY",
    name: "High-risk counterparty country",
    rule_type: "high_risk_country",
    param_text: "RU,KP,SY,IR",
    score_weight: 30,
    enabled: true,
  },
  {
    rule_set_id: 1,
    code: "STRUCTURING",
    name: "Possible structuring",
    rule_type: "structuring",
    param_number: 10000,
    score_weight: 25,
    enabled: true,
  },
  {
    rule_set_id: 1,
    code: "HIGH_RISK_CUSTOMER",
    name: "High-risk customer party",
    rule_type: "high_risk_customer",
    score_weight: 35,
    enabled: true,
  },
] as const;

const SEED_TXNS = [
  { customer_id: 1, amount: 25000, currency: "USD", direction: "debit", counterparty_country: "RU", channel: "wire", txn_timestamp: 1755648000000 },
  { customer_id: 2, amount: 12000, currency: "USD", direction: "credit", counterparty_country: "AE", channel: "wire", txn_timestamp: 1755651600000 },
  { customer_id: 3, amount: 9500, currency: "USD", direction: "debit", counterparty_country: "US", channel: "ach", txn_timestamp: 1755655200000 },
  { customer_id: 4, amount: 4000, currency: "EUR", direction: "debit", counterparty_country: "SY", channel: "wire", txn_timestamp: 1755658800000 },
  { customer_id: 5, amount: 500, currency: "EUR", direction: "credit", counterparty_country: "DE", channel: "card", txn_timestamp: 1755662400000 },
  { customer_id: 1, amount: 9800, currency: "USD", direction: "debit", counterparty_country: "DE", channel: "ach", txn_timestamp: 1755666000000 },
  { customer_id: 3, amount: 40000, currency: "USD", direction: "debit", counterparty_country: "KP", channel: "wire", txn_timestamp: 1755669600000 },
] as const;

/**
 * POST /api:aml/seed/reset — truncate everything, reinstall the demo fixture,
 * and score every transaction through the shared function so the alert trail is
 * populated. Public, so the frontend can bootstrap an empty ephemeral. A deploy
 * is a full replace, and this endpoint restores a known demo state on demand.
 */
export const seedReset = query({
  name: "seed/reset",
  verb: "POST",
  apiGroup: aml,
  stack: [
    s.db.truncate({ table: alerts, reset: true }),
    s.db.truncate({ table: transactions, reset: true }),
    s.db.truncate({ table: monitoringRules, reset: true }),
    s.db.truncate({ table: ruleSets, reset: true }),
    s.db.truncate({ table: customers, reset: true }),
    s.db.truncate({ table: users, reset: true }),
    ...SEED_USERS.map((u) => s.db.add({ table: users, row: u })),
    ...SEED_CUSTOMERS.map((cu) => s.db.add({ table: customers, row: cu })),
    ...SEED_RULE_SETS.map((rs) => s.db.add({ table: ruleSets, row: rs })),
    ...SEED_RULES.map((r) => s.db.add({ table: monitoringRules, row: r })),
    ...SEED_TXNS.map((t) => s.db.add({ table: transactions, row: t })),
    s.db.query({ table: transactions, sort: [{ sortBy: "id", dir: "asc" }], as: "all_txns" }),
    s.foreach({
      as: "t",
      list: ref("all_txns"),
      body: [s.function.run({ fn: scoreTransaction, input: { transaction_id: ref("t.id") } })],
    }),
    s.db.query({ table: alerts, returnType: "count", as: "alert_count" }),
  ],
  response: {
    ok: c.bool(true),
    users: c.int(SEED_USERS.length),
    customers: c.int(SEED_CUSTOMERS.length),
    rule_sets: c.int(SEED_RULE_SETS.length),
    rules: c.int(SEED_RULES.length),
    transactions: c.int(SEED_TXNS.length),
    alerts: ref("alert_count"),
  },
});
