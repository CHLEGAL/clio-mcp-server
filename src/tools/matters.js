// =============================================================
// MCP Tools: Matters
// =============================================================

import { getClioClient } from "../clio/client.js";

export function registerMatterTools(server) {
  const clio = getClioClient();

  server.tool(
    "clio_search_matters",
    "Search Clio matters by name, number, client name, or keyword. Returns matter ID, display number, description, status, client name, practice area, open/close dates, and responsible attorney.",
    {
      query: {
        type: "string",
        description: "Search term (matter name, number, or client name)",
      },
      status: {
        type: "string",
        description:
          "Filter by status: open, pending, closed. Omit for all.",
        enum: ["open", "pending", "closed"],
      },
      limit: {
        type: "number",
        description: "Max results (default 20, max 200)",
      },
    },
    async ({ query, status, limit }) => {
      const params = {
        query: query || undefined,
        status: status || undefined,
        limit: limit || 20,
        fields:
          "id,display_number,description,status,open_date,close_date,billable,client{id,name},practice_area{id,name},responsible_attorney{id,name},statute_of_limitations{status,due_at}",
        order: "id(desc)",
      };

      // Remove undefined
      Object.keys(params).forEach(
        (k) => params[k] === undefined && delete params[k]
      );

      const data = await clio.get("/matters.json", params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total_records: data.meta?.records,
                matters: data.data,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "clio_get_matter",
    "Get full details of a specific Clio matter by its ID. Returns all matter fields including client, practice area, billing info, dates, responsible attorney, custom fields, and statute of limitations.",
    {
      matter_id: {
        type: "number",
        description: "The Clio matter ID",
      },
    },
    async ({ matter_id }) => {
      const data = await clio.get(`/matters/${matter_id}.json`, {
        fields:
          "id,display_number,description,status,open_date,close_date,pending_date,billable,billing_method,client{id,name,type},practice_area{id,name},responsible_attorney{id,name},originating_attorney{id,name},statute_of_limitations{status,due_at},custom_field_values{id,field_name,value},relationships{id,description,contact{id,name}}",
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
      };
    }
  );

  server.tool(
    "clio_create_matter",
    "Create a new matter in Clio. Requires description and client_id at minimum.",
    {
      description: {
        type: "string",
        description: "Matter description / name",
      },
      client_id: {
        type: "number",
        description: "Clio client ID to associate the matter with",
      },
      status: {
        type: "string",
        description: "Matter status (default: open)",
        enum: ["open", "pending"],
      },
      practice_area_id: {
        type: "number",
        description: "Practice area ID (optional)",
      },
      responsible_attorney_id: {
        type: "number",
        description: "Responsible attorney user ID (optional)",
      },
      billable: {
        type: "boolean",
        description: "Whether the matter is billable (default: true)",
      },
    },
    async ({
      description,
      client_id,
      status,
      practice_area_id,
      responsible_attorney_id,
      billable,
    }) => {
      const body = {
        data: {
          description,
          client: { id: client_id },
          status: status || "open",
          billable: billable !== false,
        },
      };
      if (practice_area_id)
        body.data.practice_area = { id: practice_area_id };
      if (responsible_attorney_id)
        body.data.responsible_attorney = { id: responsible_attorney_id };

      const data = await clio.post("/matters.json", body);
      return {
        content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
      };
    }
  );
}
