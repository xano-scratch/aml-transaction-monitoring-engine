import { query, input, s, ref, inp, col, expr } from "@xanots/sdk";
import { aml } from "./aml.js";
import { users } from "../tables/users.js";
import { monitoringRules } from "../tables/monitoring-rules.js";

/**
 * GET /api:aml/rulesets/rules?rule_set_id= — the rules of one version.
 * `rule_set_id` narrows a list, so it stays a query-string param. Any signed-in
 * role.
 */
export const rulesetsRules = query({
  name: "rulesets/rules",
  verb: "GET",
  apiGroup: aml,
  auth: users,
  input: { rule_set_id: input.int({ required: true }) },
  stack: [
    s.db.query({
      table: monitoringRules,
      where: expr(col("rule_set_id"), "=", inp("rule_set_id")),
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
