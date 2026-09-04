import { table, f } from "@xanots/sdk";

/**
 * The RBAC auth table. Every protected endpoint names this table as `auth:`,
 * and the per-endpoint role guards read the caller's `role` to enforce who may
 * author or activate rules. Access is checked at the API layer, never with
 * row-level security.
 */
export const users = table({
  name: "users",
  auth: true, // backs authentication (Bearer token)
  // `id` (int PK) + `created_at` (epochms) are auto-injected.
  schema: {
    email: f.email({ required: true }),
    password: f.password({ required: true }),
    name: f.text({ required: true }),
    role: f.enum(["admin", "analyst", "viewer"], { required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
