import { query, s, ref } from "@xanots/sdk";
import { aml } from "./aml.js";
import { users } from "../tables/users.js";
import { ruleSets } from "../tables/rule-sets.js";
import { monitoringRules } from "../tables/monitoring-rules.js";

/**
 * GET /api:aml/rulesets/list — every rule-set version (newest first) plus every
 * rule, so the Rule sets screen can render each version with its status and its
 * rules in one call. Any signed-in role.
 */
export const rulesetsList = query({
  name: "rulesets/list",
  verb: "GET",
  apiGroup: aml,
  auth: users,
  stack: [
    s.db.query({ table: ruleSets, sort: [{ sortBy: "version", dir: "desc" }], as: "sets" }),
    s.db.query({
      table: monitoringRules,
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "rules",
    }),
  ],
  response: { rule_sets: ref("sets"), rules: ref("rules") },
});
