#!/usr/bin/env node
// =============================================================
// One-time OAuth Setup for Clio
// Run: npm run auth
//
// This script:
// 1. Opens your browser to Clio's authorize page
// 2. You approve the permissions
// 3. Clio shows you the authorization code on-screen
// 4. You paste the code here
// 5. Script exchanges it for access + refresh tokens
// 6. Tokens are saved to .tokens.json
// =============================================================

import "dotenv/config";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = resolve(__dirname, "../../.tokens.json");

const BASE = process.env.CLIO_BASE_URL || "https://app.clio.com";
const CLIENT_ID = process.env.CLIO_CLIENT_ID;
const CLIENT_SECRET = process.env.CLIO_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.CLIO_REDIRECT_URI || "https://app.clio.com/oauth/approval";

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

async function main() {
  console.log("\n=== CLIO OAUTH SETUP – Choueke Hollander LLP ===\n");

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("ERROR: CLIO_CLIENT_ID and CLIO_CLIENT_SECRET must be set in .env");
    process.exit(1);
  }

  // Step 1: Build authorize URL
  const authUrl =
    `${BASE}/oauth/authorize?` +
    new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
    }).toString();

  console.log("STEP 1: Open this URL in your browser (while logged into Clio):\n");
  console.log(authUrl);
  console.log("\nSTEP 2: Approve the permissions when Clio asks.\n");
  console.log(
    'STEP 3: Clio will show a page with "Success code=XXXX" in the title bar'
  );
  console.log("        and the code in the URL bar after ?code=\n");

  // Try to open browser automatically
  try {
    const open = (await import("open")).default;
    await open(authUrl);
    console.log("(Browser should have opened automatically)\n");
  } catch {
    console.log("(Could not open browser automatically — copy the URL above)\n");
  }

  // Step 2: Get the code from user
  const code = await ask("Paste the authorization code here: ");

  if (!code) {
    console.error("No code provided. Aborting.");
    process.exit(1);
  }

  // Step 3: Exchange for tokens
  console.log("\nExchanging code for tokens...");

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`\nERROR: Token exchange failed (${res.status}):`);
    console.error(body);
    console.error("\nCommon causes:");
    console.error("  - Code expired (must use within 10 minutes)");
    console.error("  - Redirect URI mismatch between .env and Clio app settings");
    console.error("  - Wrong client_id or client_secret");
    process.exit(1);
  }

  const data = await res.json();

  // Step 4: Save tokens
  const tokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
  console.log(`\nSUCCESS! Tokens saved to .tokens.json`);
  console.log(`  Access token expires in: ${Math.round(data.expires_in / 3600)} hours`);
  console.log(`  Refresh token: saved (does not expire)`);

  // Step 5: Test the connection
  console.log("\nTesting connection...");
  const testRes = await fetch(`${BASE}/api/v4/users/who_am_i`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  if (testRes.ok) {
    const user = await testRes.json();
    console.log(`\nConnected as: ${user.data.name} (ID: ${user.data.id})`);
    console.log("\n=== SETUP COMPLETE ===");
    console.log("You can now run: npm start");
  } else {
    console.error("\nWarning: Token was obtained but test call failed.");
    console.error("This may resolve itself. Try: npm run test-connection");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
