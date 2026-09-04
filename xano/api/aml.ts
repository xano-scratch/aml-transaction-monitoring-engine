import { apiGroup } from "@xanots/sdk";

/**
 * The one API group every endpoint binds to. The pinned `canonical` keeps the
 * public path (`/api:aml/...`) stable and lets `getPath()` resolve in the
 * browser bundle without a lock file.
 */
export const aml = apiGroup({ name: "aml", canonical: "aml" });
