import { query, input, s, ref, inp, auth, c, col, expr } from "@xanots/sdk";
import { aml } from "./aml.js";
import { users } from "../tables/users.js";
import { ruleSets } from "../tables/rule-sets.js";

/**
 * POST /api:aml/rulesets/activate — activate a draft version: retire the prior
 * active, set this one active, and stamp `activated_at`. Admin only. This is the
 * governed state transition the versioning demo turns on.
 */
export const rulesetsActivate = query({
  name: "rulesets/activate",
  verb: "POST",
  apiGroup: aml,
  auth: users,
  input: { rule_set_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: users, fieldName: "id", fieldValue: auth("id"), output: ["id", "role"], as: "me" }),
    s.precondition({
      expr: expr(ref("me.role"), "=", c.text("admin")),
      error_type: "accessdenied",
      error: c.text("Only an admin can activate a version."),
    }),
    s.db.get({ table: ruleSets, fieldName: "id", fieldValue: inp("rule_set_id"), as: "target" }),
    s.precondition({
      expr: expr(ref("target", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Version not found."),
    }),
    s.precondition({
      expr: expr(ref("target.status"), "=", c.text("draft")),
      error_type: "badrequest",
      error: c.text("Only a draft version can be activated."),
    }),
    s.db.query({
      table: ruleSets,
      where: expr(col("status"), "=", c.text("active")),
      returnType: "single",
      as: "current",
    }),
    s.conditional({
      when: expr(ref("current", { safe: true }), "!=", c.null()),
      then: [
        s.db.edit({
          table: ruleSets,
          fieldName: "id",
          fieldValue: ref("current.id"),
          row: { status: "retired" },
        }),
      ],
    }),
    s.db.edit({
      table: ruleSets,
      fieldName: "id",
      fieldValue: inp("rule_set_id"),
      row: { status: "active", activated_at: c.now() },
      as: "activated",
    }),
  ],
  response: ref("activated"),
});
