import { query, input, s, ref, inp, c, expr } from "@xanots/sdk";
import { aml } from "./aml.js";
import { users } from "../tables/users.js";
import { customers } from "../tables/customers.js";
import { transactions } from "../tables/transactions.js";

/**
 * POST /api:aml/txn/ingest — validate and persist a transaction. Any signed-in
 * role may ingest. Typed inputs reject a bad currency/direction/channel at the
 * boundary; the stack checks the amount is positive and the customer exists.
 */
export const txnIngest = query({
  name: "txn/ingest",
  verb: "POST",
  apiGroup: aml,
  auth: users,
  input: {
    customer_id: input.int({ required: true }),
    amount: input.decimal({ required: true }),
    currency: input.enum(["USD", "EUR", "GBP", "AED", "CHF", "SGD"], { required: true }),
    direction: input.enum(["debit", "credit"], { required: true }),
    counterparty_country: input.text({ required: true, methods: ["trim", "upper"] }),
    channel: input.enum(["wire", "card", "ach", "internal"], { required: true }),
  },
  stack: [
    s.precondition({
      expr: expr(inp("amount"), ">", c.int(0)),
      error_type: "inputerror",
      error: c.text("Amount must be greater than zero."),
    }),
    s.db.get({ table: customers, fieldName: "id", fieldValue: inp("customer_id"), as: "cust" }),
    s.precondition({
      expr: expr(ref("cust", { safe: true }), "!=", c.null()),
      error_type: "inputerror",
      error: c.text("Unknown customer."),
    }),
    s.db.add({
      table: transactions,
      row: {
        customer_id: inp("customer_id"),
        amount: inp("amount"),
        currency: inp("currency"),
        direction: inp("direction"),
        counterparty_country: inp("counterparty_country"),
        channel: inp("channel"),
        txn_timestamp: c.now(),
      },
      as: "txn",
    }),
  ],
  response: ref("txn"),
});
