import { table, f } from "@xanots/sdk";
import { customers } from "./customers.js";

/** The event that gets screened against the active rule set. */
export const transactions = table({
  name: "transactions",
  schema: {
    customer_id: f.tableRef(customers, { required: true }),
    amount: f.decimal({ required: true }),
    currency: f.text({ required: true }),
    direction: f.enum(["debit", "credit"], { required: true }),
    counterparty_country: f.text({ required: true }),
    channel: f.enum(["wire", "card", "ach", "internal"], { required: true }),
    txn_timestamp: f.timestamp({ required: true }),
  },
});
