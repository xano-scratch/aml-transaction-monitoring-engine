import { workspace } from "@xanots/sdk";

// Tables
import { users } from "./tables/users.js";
import { customers } from "./tables/customers.js";
import { transactions } from "./tables/transactions.js";
import { ruleSets } from "./tables/rule-sets.js";
import { monitoringRules } from "./tables/monitoring-rules.js";
import { alerts } from "./tables/alerts.js";

// API group + shared function
import { aml } from "./api/aml.js";
import { scoreTransaction } from "./functions/score-transaction.js";

// Endpoints
import { authLogin } from "./api/auth-login.js";
import { txnIngest } from "./api/txn-ingest.js";
import { txnList } from "./api/txn-list.js";
import { scoreRun } from "./api/score-run.js";
import { alertsList } from "./api/alerts-list.js";
import { alertsDetail } from "./api/alerts-detail.js";
import { rulesetsList } from "./api/rulesets-list.js";
import { rulesetsRules } from "./api/rulesets-rules.js";
import { rulesetsDraft } from "./api/rulesets-draft.js";
import { rulesetsRuleUpdate } from "./api/rulesets-rule-update.js";
import { rulesetsActivate } from "./api/rulesets-activate.js";
import { seedReset } from "./api/seed-reset.js";

/**
 * AML Transaction-Monitoring Rules Engine — one governed, versioned scoring API
 * every payment rail and case tool can call. See xano/EXAMPLE.md for the shape.
 */
export default workspace("aml-transaction-monitoring-engine")
  .registerTables([users, customers, transactions, ruleSets, monitoringRules, alerts])
  .registerApiGroups([aml])
  .registerFunctions([scoreTransaction])
  .registerQueries([
    authLogin,
    txnIngest,
    txnList,
    scoreRun,
    alertsList,
    alertsDetail,
    rulesetsList,
    rulesetsRules,
    rulesetsDraft,
    rulesetsRuleUpdate,
    rulesetsActivate,
    seedReset,
  ]);
