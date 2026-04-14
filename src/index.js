#!/usr/bin/env node
// =============================================================
// Clio MCP Server – Choueke Hollander LLP
// Claude Integration for Clio Practice Management
//
// Transports:
//   - stdio (default): for Claude Desktop / Claude Code
//   - http: for remote deployment (set MCP_TRANSPORT=http)
// =============================================================

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { registerAllTools } from "./tools/all-tools.js";
import { randomUUID } from "crypto";
const PORT = process.env.PORT || 3847;
const BEARER = process.env.MCP_BEARER_TOKEN || null;
const STDIO = process.argv.includes("stdio");
function make() { const s = new McpServer({ name: "clio-ch-llp", version: "1.0.0" }); registerAllTools(s); return s; }
async function runStdio() { const s = make(); await s.connect(new StdioServerTransport()); }
async function runHttp() {
  const app = express();
  app.use(express.json());
  app.get("/", (q,r) => r.json({ status: "ok" }));
  app.get("/health", (q,r) => r.json({ status: "ok" }));
  const chk = (q,r,n) => { if(!BEARER) return n(); if(q.headers.authorization !== "Bearer "+BEARER) return r.status(401).json({e:1}); n(); };
  const S = new Map();
  app.post("/mcp", chk, async (rq,rs) => { try { const id = rq.headers["mcp-session-id"] || randomUUID(); let t = S.get(id); if(!t) { t = new StreamableHTTPServerTransport({ sessionId:id, onsessioninitialized: i=>S.set(i,t), onsessionfinished: i=>S.delete(i) }); await make().connect(t); } await t.handleRequest(rq,rs,rq.body); } catch(e) { if(!rs.headersSent) rs.status(500).json({e:e.message}); } });
  app.get("/mcp", chk, async (q,r) => { const t=S.get(q.headers["mcp-session-id"]); if(t) await t.handleRequest(q,r); else r.status(400).json({e:1}); });
  app.delete("/mcp", chk, async (q,r) => { const i=q.headers["mcp-session-id"]; if(i&&S.has(i)){await S.get(i).handleRequest(q,r);S.delete(i);}else r.status(404).json({e:1}); });
  app.listen(PORT, () => console.error("[Clio MCP] port "+PORT));
}
if(STDIO) runStdio().catch(e=>{console.error(e);process.exit(1);}); else runHttp().catch(e=>{console.error(e);process.exit(1);});
