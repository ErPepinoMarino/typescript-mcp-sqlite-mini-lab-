import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getDB } from "./db/connection.js";
import { z } from "zod";

//Creamos el server MCP minimo
//Le ponemos el nombre del proyecto
//capabilities = lo que el servidor anuncia que sabe hacer
const server = new McpServer(
  { name: "typescript-mcp-sqlite-lab", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

//el transport lee de stdin y escribe en stdout
const transport = new StdioServerTransport();

//Registramos una de las tools que podremos acceder dentro de capabilities
//En este caso es muy sencilla, solo lista los nombres de las tablas alfabeticamente.
server.registerTool(
  "db.list_tables",
  {
    description: "List all tables in the SQLite database",
    inputSchema: {},
  },
  async () => {
    const db = getDB();
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all();
    const names = tables.map((t) => (t as { name: string }).name);
    //Preguntaza ¿Por que type: "text" en el content?
    //Respuesta:  ContentBlock es una unión discriminada (ver types.d.ts:2037). Cada bloque DEBE llevar un campo type que indica qué es:
    //{ "type": "text",     "text": "..." }                          // texto
    //{ "type": "image",    "data": "...", "mimeType": "..." }       // imagen
    //{ "type": "audio",    "data": "...", "mimeType": "..." }       // audio
    //{ "type": "resource", "uri": "..." }                           // recurso embebido
    //clave esto.
    return {
      content: [{ type: "text", text: names.join(", ") }],
    };
  }
);
//Aquí ya necesitamos Zod para algo aparentemente tonto, pero no.
server.registerTool(
  "db.describe_table",
  {
    description: "Describe the schema of a specific table",
    // Usamos zod solo para comprobar que "espero un texto que tenga al menos 1 carácter"
    // El SDK de MCP está construido alrededor de zod y ademas comprueba que sea un texto, no un objeto, ni null ni undefined...
    // Pero si, a primera vista parece raro.
    inputSchema: { tableName: z.string().min(1) },
  },
  async ({ tableName }) => {
    //Validacion para evitar inyeccion, seguridad. (RegEx)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return {
        content: [{ type: "text", text: `Invalid table name: ${tableName}` }],
        isError: true,
      };
    }
    const db = getDB();
    const createSql = db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(tableName) as { sql: string } | undefined;
    if (!createSql) {
      return {
        content: [{ type: "text", text: `Table not found: ${tableName}` }],
        isError: true,
      };
    }
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as {
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }[];
    const lines = columns.map(
      (c) =>
        `- ${c.name} (${c.type})${c.pk ? " PRIMARY KEY" : ""}${c.notnull ? " NOT NULL" : ""}${
          c.dflt_value ? ` DEFAULT ${c.dflt_value}` : ""
        }`
    );
    return {
      content: [
        {
          type: "text",
          text: `Table: ${tableName}\n\n${createSql.sql}\n\nColumns:\n${lines.join("\n")}`,
        },
      ],
    };
  }
);
//arrancamos el server.
await server.connect(transport);
