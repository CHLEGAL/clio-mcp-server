// =============================================================
// MCP Tools: Documents
// =============================================================

import { getClioClient } from "../clio/client.js";

export function registerDocumentTools(server) {
  const clio = getClioClient();

  server.tool(
    "clio_search_documents",
    "Search documents in Clio by matter, name, or keyword.",
    {
      matter_id: { type: "number", description: "Filter by matter ID" },
      query: { type: "string", description: "Search by document name" },
      limit: { type: "number", description: "Max results (default 30)" },
    },
    async ({ matter_id, query, limit }) => {
      const params = {
        fields:
          "id,name,content_type,created_at,updated_at,latest_document_version{id,created_at},matter{id,display_number},creator{id,name},parent{id,name,type}",
        limit: limit || 30,
        order: "updated_at(desc)",
      };
      if (matter_id) params.matter_id = matter_id;
      if (query) params.query = query;

      const data = await clio.get("/documents.json", params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { total: data.meta?.records, documents: data.data },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}

// =============================================================
// MCP Tools: Billing
// =============================================================

export function registerBillingTools(server) {
  const clio = getClioClient();

  server.tool(
    "clio_list_bills",
    "List bills for a matter or client, with status filtering.",
    {
      matter_id: { type: "number", description: "Filter by matter ID" },
      client_id: { type: "number", description: "Filter by client ID" },
      status: {
        type: "string",
        description: "Filter: draft, awaiting_approval, approved, sent, paid, void",
      },
      limit: { type: "number", description: "Max results (default 20)" },
    },
    async ({ matter_id, client_id, status, limit }) => {
      const params = {
        fields:
          "id,number,subject,status,issued_at,due_at,total,amount_due,paid,pending,matter{id,display_number},client{id,name}",
        limit: limit || 20,
        order: "issued_at(desc)",
      };
      if (matter_id) params.matter_id = matter_id;
      if (client_id) params.client_id = client_id;
      if (status) params.status = status;

      const data = await clio.get("/bills.json", params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { total: data.meta?.records, bills: data.data },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "clio_get_bill",
    "Get full details of a specific bill including line items.",
    {
      bill_id: { type: "number", description: "Bill ID" },
    },
    async ({ bill_id }) => {
      const data = await clio.get(`/bills/${bill_id}.json`, {
        fields:
          "id,number,subject,status,issued_at,due_at,total,amount_due,paid,pending,client{id,name},matter{id,display_number},line_items{id,description,quantity,rate,total,type,activity{id,date,note}}",
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
      };
    }
  );
}
