import { db } from "../src/lib/db";
import { subscriptions, billingEvents, workspaces } from "../src/lib/db/schema";
import { desc, isNotNull } from "drizzle-orm";

async function main() {
  console.log("--- Checking Billing Database ---\n");

  const events = await db.query.billingEvents.findMany({
    orderBy: [desc(billingEvents.createdAt)],
    limit: 5,
  });

  console.log(`Found ${events.length} recent billing events:`);
  events.forEach(e => {
    console.log(`- [${e.createdAt}] ${e.eventType} for Workspace: ${e.workspaceId} (Amount: ${e.amount} ${e.currency})`);
  });

  console.log("\n--- Active Subscriptions ---");
  const subs = await db.query.subscriptions.findMany({
    orderBy: [desc(subscriptions.createdAt)],
    limit: 5,
  });
  
  console.log(`Found ${subs.length} subscriptions:`);
  subs.forEach(s => {
    console.log(`- [${s.status}] Plan: ${s.plan} (Workspace: ${s.workspaceId})`);
  });

  console.log("\n--- Workspaces with Customer IDs ---");
  const wss = await db.query.workspaces.findMany({
    where: isNotNull(workspaces.dodoCustomerId),
    limit: 5,
  });

  console.log(`Found ${wss.length} workspaces with Dodo Customer IDs:`);
  wss.forEach(w => {
    console.log(`- Workspace: ${w.name} (Plan: ${w.plan}, Customer ID: ${w.dodoCustomerId})`);
  });

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
