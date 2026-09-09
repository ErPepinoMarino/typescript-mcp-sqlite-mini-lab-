import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getDB, getReadOnlyDB } from "./db/connection.js";
import {
  describeTable,
  exportCsv,
  insert,
  listTableResources,
  listTables,
  query,
  readSchema,
  readTableResource,
} from "./db/operations.js";
import { z } from "zod";

//Creamos el server MCP minimo
//Le ponemos el nombre del proyecto
//capabilities = lo que el servidor anuncia que sabe hacer
const server = new McpServer(
  { name: "typescript-mcp-sqlite-lab", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

//el transport lee de stdin y escribe en stdout
const transport = new StdioServerTransport();

//Registramos las tools a las que podremos acceder dentro de capabilities

//En este caso es muy sencilla, solo lista los nombres de las tablas alfabeticamente.
server.registerTool(
  "db.list_tables",
  {
    description: "List all tables in the SQLite database",
    inputSchema: {},
  },
  async () => {
    return listTables(getDB());
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
    return describeTable(getDB(), tableName);
  }
);

//Permite ejecutar una consulta de SOLO LECTURA en nuestra bdd.
server.registerTool(
  "db.query",
  {
    description: "Execute a read-only SELECT query",
    //El truco de zod. Aqui llegará la consulta y garantizamos que minimo sera un string con 1 caracter.
    inputSchema: { sql: z.string().min(1) },
  },
  async ({ sql }) => {
    //La garantia real de solo lectura viene de getReadOnlyDB().
    return query(getReadOnlyDB(), sql);
  }
);
//Permite insertar una fila en una tabla (lectura-escritura).
server.registerTool(
  "db.insert",
  {
    description: "Insert a row into a table",
    inputSchema: {
      table: z.string().min(1),
      row: z.record(z.string(), z.unknown()),
    },
  },
  async ({ table, row }) => {
    return insert(getDB(), table, row as Record<string, unknown>);
  }
);
//Permite exportar el contenido de una tabla como CSV.
server.registerTool(
  "db.export_csv",
  {
    description: "Export the contents of a table as CSV",
    inputSchema: { table: z.string().min(1) },
  },
  async ({ table }) => {
    return exportCsv(getReadOnlyDB(), table);
  }
);
//Resource: db://schema → entrega el esquema como información legible
server.registerResource(
  "schema",
  "db://schema",
  { description: "Database schema as SQL CREATE statements", mimeType: "text/plain" },
  async (_uri: URL) => {
    return readSchema(getReadOnlyDB());
  }
);
//Resource dinámico: db://table/{tableName} → entrega los datos de cualquier tabla como CSV
const tableResourceTemplate = new ResourceTemplate("db://table/{tableName}", {
  list: async () => {
    return listTableResources(getReadOnlyDB());
  },
});
server.registerResource(
  "table",
  tableResourceTemplate,
  { description: "Individual table data as CSV", mimeType: "text/plain" },
  async (uri: URL, variables: Record<string, string | string[]>) => {
    return readTableResource(getReadOnlyDB(), uri.href, variables["tableName"] as string);
  }
);
//arrancamos el server.
await server.connect(transport);
