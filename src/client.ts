import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  //Creamos el clientTransport que, en args, lanzará el servidor como subproceso.
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
  });

  //Creamos el cliente lo conectamos al servidor y mostramos info
  const client = new Client({ name: "local-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);
  console.log("Connected to:", client.getServerVersion());

  //Mostramos qué puede hacer el cliente (que le ofrece el servidor hacer)
  const tools = await client.listTools();

  const describe = await client.callTool({
    name: "db.describe_table",
    arguments: { tableName: "users" },
  });
  console.log("Describe users:", JSON.stringify(describe, null, 2));

  const query = await client.callTool({
    name: "db.query",
    arguments: { sql: "SELECT * FROM products ORDER BY price LIMIT 3" },
  });
  console.log("Query products:", JSON.stringify(query, null, 2));

const badQuery = await client.callTool({
  name: "db.query",
  arguments: { sql: "DROP TABLE users" },
});
console.log("Destructive rejected:", JSON.stringify(badQuery, null, 2));

const insert = await client.callTool({
  name: "db.insert",
  arguments: { table: "products", row: { name: "Widget D", price: 39.99, stock: 10 } },
});
console.log("Insert:", JSON.stringify(insert, null, 2));

const badInsert = await client.callTool({
  name: "db.insert",
  arguments: { table: "products", row: { nonexistent: 1 } },
});
console.log("Bad column rejected:", JSON.stringify(badInsert, null, 2));

const csv = await client.callTool({
  name: "db.export_csv",
  arguments: { table: "products" },
});
console.log("Export CSV:", JSON.stringify(csv, null, 2));

console.log("Available tools:", tools.tools.map((t) => t.name));

  await client.close();
}

main().catch((err) => {
  console.error("Client error:", err);
  process.exit(1);
});
