import { query, s, ref } from "@xanots/sdk";
import { aml } from "./aml.js";
import { users } from "../tables/users.js";
import { transactions } from "../tables/transactions.js";
import { customers } from "../tables/customers.js";

/**
 * GET /api:aml/txn/list — the transactions (newest first) plus the customer
 * roster the Transactions screen needs (the customer picker and the per-row
 * party summary). Any signed-in role.
 */
export const txnList = query({
  name: "txn/list",
  verb: "GET",
  apiGroup: aml,
  auth: users,
  stack: [
    s.db.query({
      table: transactions,
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
    s.db.query({ table: customers, sort: [{ sortBy: "name", dir: "asc" }], as: "custs" }),
  ],
  response: { transactions: ref("rows"), customers: ref("custs") },
});
