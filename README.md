# Clio MCP Server — Choueke Hollander LLP

Claude ↔ Clio integration via Model Context Protocol.

Lets Claude search matters, look up contacts, log time entries, create tasks,
manage calendar entries, search documents, and check billing — all directly
from the Claude interface.

---

## Prerequisites

- **Node.js 18+** — check with `node --version`
- **Clio account** on `app.clio.com` (US instance, confirmed)
- **Claude Desktop** or **Claude Code** installed

---

## Step-by-Step Setup

### 1. FIX THE CLIO DEVELOPER PORTAL SETTINGS

Log into Clio → Settings → Developer Applications → Edit your app.

**Change the Redirect URI to:**
```
https://app.clio.com/oauth/approval
```

**Delete** the old `http://127.0.0.1:8080/callback` entry.

Click **Save**.

The rest of your settings are fine (all permissions R/W, website URL, etc.).

### 2. INSTALL DEPENDENCIES

```bash
cd clio-mcp-server
npm install
```

### 3. RUN THE ONE-TIME OAUTH SETUP

```bash
npm run auth
```

This will:
1. Open your browser to Clio's authorization page
2. You click "Approve" on Clio's permissions screen
3. Clio shows a page with the code in the URL bar (after `?code=`)
   and in the page title: "Success code=XXXXXXX"
4. Copy that code, paste it into the terminal
5. The script exchanges it for access + refresh tokens
6. Tokens are saved to `.tokens.json`
7. A test call confirms the connection

### 4. TEST THE CONNECTION

```bash
npm run test-connection
```

Should show your name and a sample of matters.

### 5. CONNECT TO CLAUDE DESKTOP

Open Claude Desktop → Settings → Developer → Edit Config.

Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "clio": {
      "command": "node",
      "args": ["/FULL/PATH/TO/clio-mcp-server/src/index.js"],
      "cwd": "/FULL/PATH/TO/clio-mcp-server"
    }
  }
}
```

**Replace `/FULL/PATH/TO/` with the actual absolute path.**

On Mac, the config file is at:
`~/Library/Application Support/Claude/claude_desktop_config.json`

On Windows:
`%APPDATA%\Claude\claude_desktop_config.json`

Restart Claude Desktop completely (quit and reopen).

### 5b. CONNECT TO CLAUDE CODE (alternative)

```bash
claude mcp add clio --command "node" --args "/FULL/PATH/TO/clio-mcp-server/src/index.js"
```

---

## Available Tools

Once connected, Claude can use these commands:

| Tool | What it does |
|---|---|
| `clio_search_matters` | Search matters by name/number/client |
| `clio_get_matter` | Get full matter details by ID |
| `clio_create_matter` | Create a new matter |
| `clio_search_contacts` | Search contacts (clients, companies, counsel) |
| `clio_get_contact` | Get full contact details |
| `clio_create_contact` | Create a new contact |
| `clio_create_time_entry` | Log time (0.1h increments, with narrative) |
| `clio_list_time_entries` | List time entries by matter/user/date |
| `clio_create_expense` | Log a disbursement |
| `clio_list_tasks` | List tasks by matter/user/status |
| `clio_create_task` | Create a task with due date |
| `clio_complete_task` | Mark task complete |
| `clio_list_calendar_entries` | List upcoming calendar events |
| `clio_create_calendar_entry` | Create calendar entry (deadlines, hearings) |
| `clio_search_documents` | Search documents by matter/keyword |
| `clio_list_bills` | List bills by matter/client/status |
| `clio_get_bill` | Get bill details with line items |
| `clio_who_am_i` | Current user info |
| `clio_list_users` | List all firm users |

---

## Example Prompts

Once connected, try:

- "Search Clio for the Tremblay matter"
- "Log 0.5 hours on matter 12345 for drafting mise en demeure"
- "Create a task on the Goldberg file: prescription deadline January 15 2027"
- "Show me all open matters for client Dupont"
- "What bills are outstanding for matter 98765?"
- "Create a calendar entry: hearing, May 3 2026 at 9:30 AM, Montreal courthouse"

---

## Token Management

- Access tokens expire after ~7 days
- The server auto-refreshes using the refresh token
- Refresh tokens do not expire (per Clio docs)
- Tokens are stored in `.tokens.json` (git-ignored)
- If tokens break, re-run `npm run auth`

---

## Security Notes

- `.env` and `.tokens.json` are git-ignored
- Never commit credentials to version control
- Consider rotating your client secret in the Clio Developer Portal
  (the current one appeared in uploaded PDFs)
- The MCP server runs locally as a subprocess — no cloud exposure
