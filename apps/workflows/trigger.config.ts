import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_bakery_workflows",
  runtime: "node",
  logLevel: "log",
  maxDuration: 600, // 10 minutos
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src"],
});
