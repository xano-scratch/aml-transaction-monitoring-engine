import { query, input, s, ref, inp, c, expr } from "@xanots/sdk";
import { aml } from "./aml.js";
import { users } from "../tables/users.js";
import { alerts } from "../tables/alerts.js";
import { transactions } from "../tables/transactions.js";
import { customers } from "../tables/customers.js";

/**
 * GET /api:aml/alerts/detail/{alert_id} — one alert with its snapshotted firing
 * rules, score and rule-set version, plus the underlying transaction and
 * customer. The explainability surface. `alert_id` is a path segment because it
 * addresses one row. Any signed-in role.
 */
export const alertsDetail = query({
  name: "alerts/detail/{alert_id}",
  verb: "GET",
  apiGroup: aml,
  auth: users,
  input: { alert_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: alerts, fieldName: "id", fieldValue: inp("alert_id"), as: "alert" }),
    s.precondition({
      expr: expr(ref("alert", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Alert not found."),
    }),
    s.db.get({
      table: transactions,
      fieldName: "id",
      fieldValue: ref("alert.transaction_id"),
      as: "txn",
    }),
    s.db.get({
      table: customers,
      fieldName: "id",
      fieldValue: ref("txn.customer_id"),
      as: "customer",
    }),
  ],
  response: { alert: ref("alert"), transaction: ref("txn"), customer: ref("customer") },
});
