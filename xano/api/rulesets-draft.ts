import { query, s, ref, auth, c, col, expr, or, withFilters, fl } from "@xanots/sdk";
import { aml } from "./aml.js";
import { users } from "../tables/users.js";
import { ruleSets } from "../tables/rule-sets.js";
import { monitoringRules } from "../tables/monitoring-rules.js";

/**
 * POST /api:aml/rulesets/draft — clone the active version into a new draft,
 * copying its rules. Role guard (admin or analyst) enforced at the API layer.
 * The new version is `max(version) + 1`.
 */
export const rulesetsDraft = query({
  name: "rulesets/draft",
  verb: "POST",
  apiGroup: aml,
  auth: users,
  stack: [
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), output: ["id", "role"], as: "me" }),
    s.precondition({
      expr: or(
        expr(ref("me.role"), "=", c.text("admin")),
        expr(ref("me.role"), "=", c.text("analyst")),
      ),
      error_type: "accessdenied",
      error: c.text("Only analysts or admins can create a draft."),
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
      error: c.text("No active rule set to clone."),
    }),
    s.db.query({
      table: ruleSets,
      sort: [{ sortBy: "version", dir: "desc" }],
      returnType: "single",
      as: "top",
    }),
    s.lambda({ as: "next_version", code: ({ $var }) => Number(($var.top as any).version) + 1 }),
    s.db.add({
      table: ruleSets,
      row: {
        version: ref("next_version"),
        status: "draft",
        note: withFilters(c.text("Draft cloned from v"), fl.concat(ref("active.version"))),
        alert_threshold: ref("active.alert_threshold"),
      },
      as: "draft",
    }),
    s.db.query({
      table: monitoringRules,
      where: expr(col("rule_set_id"), "=", ref("active.id")),
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "src_rules",
    }),
    s.foreach({
      as: "r",
      list: ref("src_rules"),
      body: [
        s.db.add({
          table: monitoringRules,
          row: {
            rule_set_id: ref("draft.id"),
            code: ref("r.code"),
            name: ref("r.name"),
            rule_type: ref("r.rule_type"),
            param_number: ref("r.param_number"),
            param_text: ref("r.param_text"),
            score_weight: ref("r.score_weight"),
            enabled: ref("r.enabled"),
          },
        }),
      ],
    }),
    s.db.query({
      table: monitoringRules,
      where: expr(col("rule_set_id"), "=", ref("draft.id")),
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "draft_rules",
    }),
  ],
  response: { rule_set: ref("draft"), rules: ref("draft_rules") },
});
