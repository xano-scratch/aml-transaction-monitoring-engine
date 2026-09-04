import { table, f } from "@xanots/sdk";
import { transactions } from "./transactions.js";

/**
 * The immutable audit record. `rule_set_version` and `fired_rules` are
 * SNAPSHOTTED at scoring time (copied, not a live join), so an alert always
 * shows exactly which rules fired under which version, even after the rules
 * change in a later version.
 */
export const alerts = table({
  name: "alerts",
  schema: {
    transaction_id: f.tableRef(transactions, { required: true }),
    rule_set_version: f.int({ required: true }),
    total_score: f.int({ required: true }),
    outcome: f.enum(["alert", "clear"], { required: true }),
    // Array of { code, name, rule_type, score_weight } captured at scoring time.
    fired_rules: f.json(),
  },
});
