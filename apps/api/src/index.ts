// apps/api/src/index.ts

import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";

/**
 * Boots the CodeVault API server.
 */
function main(): void {
  const env = loadEnv();
  const app = createApp();

  app.listen(env.PORT, () => {
    console.info(
      `[codevault-api] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
  });
}

main();
