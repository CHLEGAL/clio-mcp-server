// =============================================================
// MCP Tools: Tasks
// =============================================================

import { getClioClient } from "../clio/client.js";

export function registerTaskTools(server) {
  const clio = getClioClient();

  server.tool(
    "clio_list_tasks",
    "List tasks in Clio, optionally filtered by matter, assignee, or status.",
    {
      matter_id: { type: "number", description: "Filter by matter ID" },
      assignee_id: { type: "number", description: "Filter by assigned user ID" },
      status: {
        type: "string",
        description: "Filter: pending, in_progress, in_review, complete",
        enum: ["pending", "in_progress", "in_review", "complete"],
      },
      limit: { type: "number", description: "Max results (default 50)" },
    },
    async ({ matter_id, assignee_id, status, limit }) => {
      const params = {
        fields:
          "id,name,description,status,priority,due_at,completed_at,matter{id,display_number},assignee{id,name},task_type{id,name}",
        limit: limit || 50,
        order: "due_at(asc)",
      };
      if (matter_id) params.matter_id = matter_id;
      if (assignee_id) params.assignee_id = assignee_id;
      if (status) params.status = status;

      const data = await clio.get("/tasks.json", params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { total: data.meta?.records, tasks: data.data },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "clio_create_task",
    "Create a task in Clio linked to a matter. Use for deadlines, to-dos, follow-ups.",
    {
      name: { type: "string", description: "Task name/title" },
      matter_id: { type: "number", description: "Matter ID to link task to" },
      description: { type: "string", description: "Task details (optional)" },
      due_at: {
        type: "string",
        description: "Due date in YYYY-MM-DD format",
      },
      priority: {
        type: "string",
        description: "Priority level",
        enum: ["Low", "Normal", "High"],
      },
      assignee_id: {
        type: "number",
        description: "User ID to assign the task to",
      },
    },
    async ({ name, matter_id, description, due_at, priority, assignee_id }) => {
      const body = {
        data: {
          name,
          description: description || "",
          status: "pending",
          priority: priority || "Normal",
          matter: { id: matter_id },
        },
      };
      if (due_at) body.data.due_at = due_at;
      if (assignee_id) body.data.assignee = { id: assignee_id };

      const data = await clio.post("/tasks.json", body);
      return {
        content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
      };
    }
  );

  server.tool(
    "clio_complete_task",
    "Mark a Clio task as complete.",
    {
      task_id: { type: "number", description: "Task ID to complete" },
    },
    async ({ task_id }) => {
      const data = await clio.patch(`/tasks/${task_id}.json`, {
        data: { status: "complete" },
      });
      return {
        content: [
          {
            type: "text",
            text: `Task ${task_id} marked as complete.`,
          },
        ],
      };
    }
  );
}
