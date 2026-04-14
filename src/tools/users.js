// =============================================================
// MCP Tools: Users
// =============================================================

import { getClioClient } from "../clio/client.js";

export function registerUserTools(server) {
  const clio = getClioClient();

  server.tool(
    "clio_who_am_i",
    "Get the currently authenticated Clio user's info — name, ID, email, subscription details.",
    {},
    async () => {
      const data = await clio.get("/users/who_am_i.json", {
        fields: "id,name,email,enabled,subscription{id,name}",
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
      };
    }
  );

  server.tool(
    "clio_list_users",
    "List all users in the Clio account (lawyers, staff).",
    {
      limit: { type: "number", description: "Max results (default 50)" },
    },
    async ({ limit }) => {
      const data = await clio.get("/users.json", {
        fields: "id,name,email,enabled,role",
        limit: limit || 50,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { total: data.meta?.records, users: data.data },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
