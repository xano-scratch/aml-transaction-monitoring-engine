import { table, f } from "@xanots/sdk";

/**
 * The version container. Exactly one row is `active` at a time; activating a
 * draft retires the prior active. `alert_threshold` is versioned alongside the
 * rules, so the alert cutoff is governed by the same version an alert cites.
 */
export const ruleSets = table({
  name: "rule_sets",
  schema: {
    version: f.int({ required: true }),
    status: f.enum(["draft", "active", "retired"], { required: true }),
    note: f.text({ required: true }),
    alert_threshold: f.int({ required: true }),
    activated_at: f.timestamp({ nullable: true }),
  },
});
