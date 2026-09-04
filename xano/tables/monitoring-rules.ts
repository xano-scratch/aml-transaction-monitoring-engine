import { table, f } from "@xanots/sdk";
import { ruleSets } from "./rule-sets.js";

/**
 * A single monitoring rule that belongs to one rule-set version. `rule_type`
 * selects how the scoring function reads the parameters: `param_number` is the
 * threshold (amount / structuring band) and `param_text` is a comma-delimited
 * list (high-risk countries). `score_weight` is added to a transaction's score
 * when the rule matches.
 */
export const monitoringRules = table({
  name: "monitoring_rules",
  schema: {
    rule_set_id: f.tableRef(ruleSets, { required: true }),
    code: f.text({ required: true }),
    name: f.text({ required: true }),
    rule_type: f.enum(
      ["amount_threshold", "high_risk_country", "structuring", "high_risk_customer"],
      { required: true },
    ),
    param_number: f.decimal({ nullable: true }),
    param_text: f.text({ nullable: true }),
    score_weight: f.int({ required: true }),
    enabled: f.bool({ required: true }),
  },
});
