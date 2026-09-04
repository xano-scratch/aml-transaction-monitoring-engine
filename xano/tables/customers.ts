import { table, f } from "@xanots/sdk";

/** The party a transaction belongs to. `risk_rating` feeds the high-risk-customer rule. */
export const customers = table({
  name: "customers",
  schema: {
    name: f.text({ required: true }),
    country: f.text({ required: true }),
    risk_rating: f.enum(["low", "medium", "high"], { required: true }),
  },
});
