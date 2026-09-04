import { query, input, s, ref, inp, auth, c, or, expr } from "@xanots/sdk";
import { aml } from "./aml.js";
import { users } from "../tables/users.js";
import { ruleSets } from "../tables/rule-sets.js";
import { monitoringRules } from "../tables/monitoring-rules.js";

/**
 * POST /api:aml/rulesets/rule-update — edit a rule's threshold, weight, or
 * enabled flag on a DRAFT version only (active and retired versions are
 * immutable, so the audit trail holds). Role guard: admin or analyst.
 */
export const rulesetsRuleUpdate = query({
  name: "rulesets/rule-update",
  verb: "POST",
  apiGroup: aml,
  auth: users,
  input: {
    rule_id: input.int({ required: true }),
    param_number: input.decimal({ required: true }),
    score_weight: input.int({ required: true }),
    enabled: input.bool({ required: true }),
  },
  stack: [
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), output: ["id", "role"], as: "me" }),
    s.precondition({
      expr: or(
        expr(ref("me.role"), "=", c.text("admin")),
        expr(ref("me.role"), "=", c.text("analyst")),
      ),
      error_type: "accessdenied",
      error: c.text("Only analysts or admins can edit a rule."),
    }),
    s.db.get({ table: monitoringRules, fieldName: "id", fieldValue: inp("rule_id"), as: "rule" }),
    s.precondition({
      expr: expr(ref("rule", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Rule not found."),
    }),
    s.db.get({ table: ruleSets, fieldName: "id", fieldValue: ref("rule.rule_set_id"), as: "set" }),
    s.precondition({
      expr: expr(ref("set.status"), "=", c.text("draft")),
      error_type: "badrequest",
      error: c.text("Only rules on a draft version can be edited."),
    }),
    s.db.edit({
      table: monitoringRules,
      fieldName: "id",
      fieldValue: inp("rule_id"),
      row: {
        param_number: inp("param_number"),
        score_weight: inp("score_weight"),
        enabled: inp("enabled"),
      },
      as: "updated",
    }),
  ],
  response: ref("updated"),
});
