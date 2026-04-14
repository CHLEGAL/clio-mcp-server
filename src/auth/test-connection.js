#!/usr/bin/env node
// Quick test: verify Clio API connection is working
import "dotenv/config";
import { getClioClient } from "../clio/client.js";

async function main() {
  console.log("\n=== CLIO CONNECTION TEST ===\n");
  const clio = getClioClient();

  if (!clio.isAuthenticated()) {
    console.error("Not authenticated. Run: npm run auth");
    process.exit(1);
  }

  try {
    const user = await clio.get("/users/who_am_i.json", {
      fields: "id,name,email,subscription",
    });
    console.log("Connected successfully!");
    console.log(`  User: ${user.data.name}`);
    console.log(`  ID:   ${user.data.id}`);
    if (user.data.email) console.log(`  Email: ${user.data.email}`);

    // Test matters access
    const matters = await clio.get("/matters.json", {
      fields: "id,display_number,description,status",
      limit: 3,
    });
    console.log(`\nMatters accessible: ${matters.meta?.records || "unknown"} total`);
    if (matters.data?.length > 0) {
      matters.data.forEach((m) => {
        console.log(`  [${m.display_number}] ${m.description} (${m.status})`);
      });
    }

    console.log("\n=== ALL GOOD ===");
  } catch (err) {
    console.error("Connection failed:", err.message);
    process.exit(1);
  }
}

main();
