// =============================================================
// MCP Tools: Activities (Time Entries, Expenses)
// =============================================================

import { getClioClient } from "../clio/client.js";

export function registerActivityTools(server) {
  const clio = getClioClient();

  server.tool(
    "clio_create_time_entry",
    "Create a time entry in Clio. Time is in hours with 0.1 increments (e.g., 0.3 = 18 minutes). Narrative should describe what was done, the purpose, and the issue addressed (no block billing).",
    {
      matter_id: {
        type: "number",
        description: "Clio matter ID to log time against",
      },
      quantity: {
        type: "number",
        description:
          "Time in hours, 0.1 increments (e.g., 0.1, 0.2, 0.5, 1.0, 2.5)",
      },
      date: {
        type: "string",
        description: "Date of work in YYYY-MM-DD format",
      },
      note: {
        type: "string",
        description:
          "Narrative: what was done / purpose / issue. Must be descriptive, no block billing.",
      },
      activity_description_id: {
        type: "number",
        description: "Activity description/code ID (optional)",
      },
      user_id: {
        type: "number",
        description: "User ID to log time for (optional, defaults to authenticated user)",
      },
    },
    async ({ matter_id, quantity, date, note, activity_description_id, user_id }) => {
      // Validate 0.1 increments
      const rounded = Math.round(quantity * 10) / 10;
      if (rounded !== quantity) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Time must be in 0.1 hour increments. ${quantity} rounded to ${rounded}. Please confirm.`,
            },
          ],
        };
      }

      const body = {
        data: {
          type: "TimeEntry",
          quantity: rounded,
          date: date,
          note: note,
          matter: { id: matter_id },
        },
      };

      if (activity_description_id) {
        body.data.activity_description = { id: activity_description_id };
      }
      if (user_id) {
        body.data.user = { id: user_id };
      }

      const data = await clio.post("/activities.json", body);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                created: true,
                id: data.data.id,
                matter_id: matter_id,
                quantity: rounded,
                date: date,
                note: note,
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
    "clio_list_time_entries",
    "List time entries for a matter or user, with optional date filtering.",
    {
      matter_id: {
        type: "number",
        description: "Filter by matter ID",
      },
      user_id: {
        type: "number",
        description: "Filter by user ID",
      },
      date_from: {
        type: "string",
        description: "Start date filter (YYYY-MM-DD)",
      },
      date_to: {
        type: "string",
        description: "End date filter (YYYY-MM-DD)",
      },
      limit: {
        type: "number",
        description: "Max results (default 50)",
      },
    },
    async ({ matter_id, user_id, date_from, date_to, limit }) => {
      const params = {
        fields:
          "id,type,date,quantity,note,total,billed,matter{id,display_number,description},user{id,name},activity_description{id,name}",
        limit: limit || 50,
        order: "date(desc)",
      };

      if (matter_id) params.matter_id = matter_id;
      if (user_id) params.user_id = user_id;
      if (date_from) params["date[]"] = `>=${date_from}`;
      if (date_to) {
        // Clio uses array notation for range filters
        if (params["date[]"]) {
          // Can't easily do range with URLSearchParams, handle in request
        }
      }

      const data = await clio.get("/activities.json", params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total_records: data.meta?.records,
                entries: data.data,
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
    "clio_create_expense",
    "Create an expense entry (disbursement) in Clio.",
    {
      matter_id: {
        type: "number",
        description: "Clio matter ID",
      },
      amount: {
        type: "number",
        description: "Expense amount in dollars (e.g., 150.00)",
      },
      date: {
        type: "string",
        description: "Date of expense in YYYY-MM-DD format",
      },
      note: {
        type: "string",
        description: "Description of the expense/disbursement",
      },
    },
    async ({ matter_id, amount, date, note }) => {
      const body = {
        data: {
          type: "Expense",
          total: amount,
          date: date,
          note: note,
          matter: { id: matter_id },
        },
      };

      const data = await clio.post("/activities.json", body);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                created: true,
                id: data.data.id,
                type: "Expense",
                amount: amount,
                matter_id: matter_id,
                note: note,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
