import { query, input, s, ref, inp, c, obj, expr } from "@xanots/sdk";
import { aml } from "./aml.js";
import { users } from "../tables/users.js";

/**
 * POST /api:aml/auth/login — verify email + password and mint a Bearer token.
 * The password is taken as `input.text` (not `input.password`, which would
 * double-hash), and the user row is read with an explicit `output` so the
 * internal password column comes back for `check_password`.
 */
export const authLogin = query({
  name: "auth/login",
  verb: "POST",
  apiGroup: aml,
  input: {
    email: input.text({ required: true, methods: ["trim", "lower"] }),
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "email", "name", "role", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.check_password({
      text_password: inp("password"),
      hash_password: ref("u.password"),
      as: "ok",
    }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
  ],
  response: {
    token: ref("token"),
    user: obj({
      id: ref("u.id"),
      email: ref("u.email"),
      name: ref("u.name"),
      role: ref("u.role"),
    }),
  },
});
