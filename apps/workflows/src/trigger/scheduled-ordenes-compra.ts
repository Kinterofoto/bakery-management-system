import { schedules } from "@trigger.dev/sdk/v3";
import { ordenesCompraWorkflow } from "./ordenes-compra";

// Scheduled trigger - runs every minute
export const ordenesCompraSchedule = schedules.create({
  task: ordenesCompraWorkflow.id,
  cron: "* * * * *", // Every minute
  deduplicationKey: "ordenes-compra-every-minute",
});
