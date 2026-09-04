import { query, input, s, ref, inp } from "@xanots/sdk";
import { aml } from "./aml.js";
import { users } from "../tables/users.js";
import { scoreTransaction } from "../functions/score-transaction.js";

/**
 * POST /api:aml/score/run — the core job. Delegates to the shared
 * `score_transaction` function, which loads the active version, scores the
 * transaction, and writes an alert. Any signed-in role may run it; re-scoring a
 * transaction writes a NEW alert so the version trail stays visible.
 */
export const scoreRun = query({
  name: "score/run",
  verb: "POST",
  apiGroup: aml,
  auth: users,
  input: { transaction_id: input.int({ required: true }) },
  stack: [
    s.function.run({
      fn: scoreTransaction,
      input: { transaction_id: inp("transaction_id") },
      as: "result",
    }),
  ],
  response: ref("result"),
});
