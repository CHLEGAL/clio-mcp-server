// =============================================================
// MCP Tools: Contacts
// =============================================================

import { getClioClient } from "../clio/client.js";

export function registerContactTools(server) {
  const clio = getClioClient();

  server.tool(
    "clio_search_contacts",
    "Search Clio contacts (clients, companies, opposing counsel) by name, email, or phone. Returns contact details including type, company, email, phone.",
    {
      query: {
        type: "string",
        description: "Search term (name, email, or phone)",
      },
      type: {
        type: "string",
        description: "Filter by type: Person or Company",
        enum: ["Person", "Company"],
      },
      limit: {
        type: "number",
        description: "Max results (default 20)",
      },
    },
    async ({ query, type, limit }) => {
      const params = {
        query: query || undefined,
        type: type || undefined,
        limit: limit || 20,
        fields:
          "id,name,type,title,company{id,name},email_addresses{name,address,default_email},phone_numbers{name,number},addresses{name,street,city,province,postal_code,country}",
        order: "name(asc)",
      };
      Object.keys(params).forEach(
        (k) => params[k] === undefined && delete params[k]
      );

      const data = await clio.get("/contacts.json", params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { total_records: data.meta?.records, contacts: data.data },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "clio_get_contact",
    "Get full details of a specific Clio contact by ID.",
    {
      contact_id: {
        type: "number",
        description: "The Clio contact ID",
      },
    },
    async ({ contact_id }) => {
      const data = await clio.get(`/contacts/${contact_id}.json`, {
        fields:
          "id,name,type,title,prefix,first_name,last_name,company{id,name},email_addresses{name,address,default_email},phone_numbers{name,number},addresses{name,street,city,province,postal_code,country},web_sites{name,address},custom_field_values{id,field_name,value}",
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
      };
    }
  );

  server.tool(
    "clio_create_contact",
    "Create a new contact (Person or Company) in Clio.",
    {
      first_name: { type: "string", description: "First name (for Person)" },
      last_name: { type: "string", description: "Last name (for Person)" },
      name: {
        type: "string",
        description: "Company name (for Company type). If set, type becomes Company.",
      },
      type: {
        type: "string",
        description: "Person or Company (auto-detected if name vs first/last provided)",
        enum: ["Person", "Company"],
      },
      email: { type: "string", description: "Primary email address" },
      phone: { type: "string", description: "Primary phone number" },
      title: { type: "string", description: "Job title (for Person)" },
      company_id: {
        type: "number",
        description: "Company contact ID to associate this person with",
      },
    },
    async ({ first_name, last_name, name, type, email, phone, title, company_id }) => {
      const contactType = name ? "Company" : type || "Person";
      const body = { data: { type: contactType } };

      if (contactType === "Company") {
        body.data.name = name;
      } else {
        body.data.first_name = first_name;
        body.data.last_name = last_name;
        if (title) body.data.title = title;
        if (company_id) body.data.company = { id: company_id };
      }

      if (email) {
        body.data.email_addresses = [
          { name: "Work", address: email, default_email: true },
        ];
      }
      if (phone) {
        body.data.phone_numbers = [{ name: "Work", number: phone }];
      }

      const data = await clio.post("/contacts.json", body);
      return {
        content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
      };
    }
  );
}
