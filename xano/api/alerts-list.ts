import { query, s, ref } from "@xanots/sdk";
import { aml } from "./aml.js";
import { users } from "../tables/users.js";
import { alerts } from "../tables/alerts.js";
import { transactions } from "../tables/transactions.js";
import { customers } from "../tables/customers.js";

/**
 * GET /api:aml/alerts/list — the alert trail (newest first) plus the
 * transactions and customers the screen joins against for each row's summary.
 * Any signed-in role.
 */
export const alertsList = query({
  name: "alerts/list",
  verb: "GET",
  apiGroup: aml,
  auth: users,
  stack: [
    s.db.query({ table: alerts, sort: [{ sortBy: "created_at", dir: "desc" }], as: "rows" }),
    s.db.query({ table: transactions, as: "txns" }),
    s.db.query({ table: customers, as: "custs" }),
  ],
  response: { alerts: ref("rows"), transactions: ref("txns"), customers: ref("custs") },
});
