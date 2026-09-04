import { defineFunction, input, s, ref, inp, c, col, expr } from "@xanots/sdk";
import { transactions } from "../tables/transactions.js";
import { customers } from "../tables/customers.js";
import { ruleSets } from "../tables/rule-sets.js";
import { monitoringRules } from "../tables/monitoring-rules.js";
import { alerts } from "../tables/alerts.js";

/**
 * The one shared scoring function — the heart of the "business logic
 * centralization" play. Both `score/run` (the API) and `seed/reset` (the demo
 * bootstrap) call it, so the sample data and every live request are screened by
 * the exact same rules.
 *
 * It loads the transaction, its customer, the ACTIVE rule-set version and that
 * version's enabled rules with native `s.db.*` statements, then interprets the
 * rules over the transaction in a single lambda (the only step the typed
 * expression surface cannot express cleanly), and writes an alert that snapshots
 * the version and the rules that fired. The rules themselves are DATA (rows in a
 * versioned rule set), so tightening a rule is a new version, never a code change.
 */
export const scoreTransaction = defineFunction({
  name: "score_transaction",
  input: { transaction_id: input.int({ required: true }) },
  stack: [
    s.db.get({
      table: transactions,
      fieldName: "id",
      fieldValue: inp("transaction_id"),
      as: "txn",
    }),
    s.precondition({
      expr: expr(ref("txn", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Transaction not found."),
    }),
    s.db.get({
      table: customers,
      fieldName: "id",
      fieldValue: ref("txn.customer_id"),
      as: "customer",
    }),
    s.db.query({
      table: ruleSets,
      where: expr(col("status"), "=", c.text("active")),
      returnType: "single",
      as: "active",
    }),
    s.precondition({
      expr: expr(ref("active", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No active rule set. Seed the demo data first."),
    }),
    s.db.query({
      table: monitoringRules,
      where: [
        expr(col("rule_set_id"), "=", ref("active.id")),
        expr(col("enabled"), "=", c.bool(true)),
      ],
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "rules",
    }),
    // Interpret the versioned rules over this transaction. Ambient bindings only
    // ($var); returns the score, the outcome, and the rules that fired.
    s.lambda({
      as: "scored",
      code: ({ $var }) => {
        const txn = $var.txn as any;
        const customer = $var.customer as any;
        const rules = (Array.isArray($var.rules) ? $var.rules : []) as any[];
        const threshold = Number(($var.active as any).alert_threshold);
        const amount = Number(txn.amount);
        const country = String(txn.counterparty_country || "").toUpperCase();
        const fired: Array<{
          code: string;
          name: string;
          rule_type: string;
          score_weight: number;
        }> = [];
        let total = 0;
        for (const r of rules) {
          const pnum =
            r.param_number === null || r.param_number === undefined
              ? null
              : Number(r.param_number);
          const ptext =
            r.param_text === null || r.param_text === undefined
              ? ""
              : String(r.param_text);
          let match = false;
          if (r.rule_type === "amount_threshold") {
            match = pnum !== null && amount >= pnum;
          } else if (r.rule_type === "high_risk_country") {
            const list = ptext
              .split(",")
              .map((x) => x.trim().toUpperCase())
              .filter(Boolean);
            match = list.indexOf(country) !== -1;
          } else if (r.rule_type === "structuring") {
            // Amount parked just under a reporting threshold (>= 90% and below it).
            match = pnum !== null && amount >= pnum * 0.9 && amount < pnum;
          } else if (r.rule_type === "high_risk_customer") {
            match = customer !== null && customer !== undefined && customer.risk_rating === "high";
          }
          if (match) {
            const weight = Number(r.score_weight) || 0;
            total += weight;
            fired.push({
              code: String(r.code),
              name: String(r.name),
              rule_type: String(r.rule_type),
              score_weight: weight,
            });
          }
        }
        return {
          total_score: total,
          fired_rules: fired,
          outcome: total >= threshold ? "alert" : "clear",
        };
      },
    }),
    s.db.add({
      table: alerts,
      row: {
        transaction_id: ref("txn.id"),
        rule_set_version: ref("active.version"),
        total_score: ref("scored.total_score"),
        outcome: ref("scored.outcome"),
        fired_rules: ref("scored.fired_rules"),
      },
      as: "alert",
    }),
  ],
  // The written alert row (id, version, score, outcome, snapshotted fired_rules).
  response: ref("alert"),
});
