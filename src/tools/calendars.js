// =============================================================
// MCP Tools: Calendar Entries
// =============================================================

import { getClioClient } from "../clio/client.js";

export function registerCalendarTools(server) {
  const clio = getClioClient();

  server.tool(
    "clio_list_calendar_entries",
    "List upcoming calendar entries (court dates, deadlines, meetings) with optional date range and matter filter.",
    {
      matter_id: { type: "number", description: "Filter by matter ID" },
      from_date: {
        type: "string",
        description: "Start date (YYYY-MM-DD). Defaults to today.",
      },
      to_date: {
        type: "string",
        description: "End date (YYYY-MM-DD). Defaults to 30 days from now.",
      },
      limit: { type: "number", description: "Max results (default 50)" },
    },
    async ({ matter_id, from_date, to_date, limit }) => {
      const now = new Date();
      const params = {
        fields:
          "id,summary,description,start_at,end_at,all_day,location,matter{id,display_number,description},calendar_owner{id,name},reminders{minutes_before}",
        limit: limit || 50,
        order: "start_at(asc)",
      };
      if (matter_id) params.matter_id = matter_id;

      const data = await clio.get("/calendar_entries.json", params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { total: data.meta?.records, entries: data.data },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "clio_create_calendar_entry",
    "Create a calendar entry in Clio. Use for court dates, prescription deadlines, meetings, reminders.",
    {
      summary: { type: "string", description: "Event title" },
      description: { type: "string", description: "Event details" },
      start_at: {
        type: "string",
        description:
          "Start date/time. For all-day: YYYY-MM-DD. For timed: YYYY-MM-DDTHH:MM:SS-04:00 (Eastern)",
      },
      end_at: {
        type: "string",
        description: "End date/time (same format as start_at)",
      },
      all_day: {
        type: "boolean",
        description: "Whether this is an all-day event",
      },
      matter_id: { type: "number", description: "Matter ID to link to" },
      location: { type: "string", description: "Location (e.g., courthouse)" },
      reminder_minutes: {
        type: "number",
        description:
          "Reminder before event in minutes (e.g., 1440 = 1 day, 10080 = 1 week)",
      },
    },
    async ({
      summary,
      description,
      start_at,
      end_at,
      all_day,
      matter_id,
      location,
      reminder_minutes,
    }) => {
      const body = {
        data: {
          summary,
          description: description || "",
          start_at,
          end_at: end_at || start_at,
          all_day: all_day || false,
        },
      };
      if (matter_id) body.data.matter = { id: matter_id };
      if (location) body.data.location = location;
      if (reminder_minutes) {
        body.data.reminders = [{ minutes_before: reminder_minutes }];
      }

      const data = await clio.post("/calendar_entries.json", body);
      return {
        content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
      };
    }
  );
}
