import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as readline from "readline";

const C = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
};

//Helpers de presentación para que cada operación quede clara y didáctica.
function sep(): void {
  console.log(`${C.dim}${"─".repeat(44)}${C.reset}`);
}

function blank(): void {
  console.log("");
}

function opType(type: string): void {
  console.log(`${C.magenta}${C.bright}${type}${C.reset}`);
}

function opName(name: string): void {
  console.log(`${C.white}${C.bright}${name}${C.reset}`);
}

function note(text: string): void {
  console.log(`${C.dim}${text}${C.reset}`);
}

function ok(text: string): void {
  console.log(`${C.green}${text}${C.reset}`);
}

function warn(text: string): void {
  console.log(`${C.yellow}${text}${C.reset}`);
}

function fail(text: string): void {
  console.log(`${C.red}${text}${C.reset}`);
}

function rawResponse(value: unknown): void {
  blank();
  console.log(`${C.yellow}${C.bright}Raw MCP response:${C.reset}`);
  note("(En bruto, tal y como llega por el protocolo. Es la estructura real que ve el cliente.)");
  console.log(formatJSON(value));
}

function formatJSON(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

//Extrae el texto legible de una respuesta MCP (tool → content[].text, resource → contents[].text).
function extractText(result: unknown): string {
  const r = result as Record<string, unknown>;
  if (Array.isArray(r?.content)) {
    return (r.content as { text?: string }[]).map((c) => c.text ?? "").join("\n");
  }
  if (Array.isArray(r?.contents)) {
    return (r.contents as { text?: string }[]).map((c) => c.text ?? "").join("\n");
  }
  if (typeof r?.text === "string") return r.text;
  return formatJSON(result);
}

function formatCSV(text: string): void {
  text
    .split("\n")
    .filter((l) => l.length > 0)
    .forEach((line) => ok(`   ${line}`));
}

//Presenta el resultado de una operación MCP (tool o resource) de forma legible.
function printMCPResult(result: unknown): void {
  const r = result as Record<string, unknown>;
  const text = extractText(result);

  if (r.isError === true) {
    fail(`   ❌ ${text || "Error desconocido"}`);
    blank();
    return;
  }

  //Si el resultado parece una lista de filas en JSON, lo mostramos formateado.
  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      console.log(formatJSON(parsed));
      blank();
      return;
    } catch {
      //No es JSON, seguimos abajo.
    }
  }

  //El resto de respuestas las mostramos tal cual (CSV, CREATE SQL, mensajes).
  formatCSV(text);
  blank();
}

function banner(): void {
  console.log(`${C.cyan}${C.bright}`);
  console.log(" ███╗   ███╗ ██████╗██████╗     ██╗      █████╗ ██████╗ ");
  console.log(" ████╗ ████║██╔════╝██╔══██╗    ██║     ██╔══██╗██╔══██╗");
  console.log(" ██╔████╔██║██║     ██████╔╝    ██║     ███████║██████╔╝");
  console.log(" ██║╚██╔╝██║██║     ██╔═══╝     ██║     ██╔══██║██╔══██╗");
  console.log(" ██║ ╚═╝ ██║╚██████╗██║         ███████╗██║  ██║██████╔╝");
  console.log(" ╚═╝     ╚═╝ ╚═════╝╚═╝         ╚══════╝╚═╝  ╚═╝╚═════╝ ");
  console.log("");
  console.log("======= MCP SQLite Mini Lab — Demo Interactivo =======");
  console.log("==== 🔧Tool = acción que se ejecuta (hace algo). ====");
  console.log("== 📚Resource = contenido que se lee (es un dato). ==");
  blank();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
});

const client = new Client({ name: "demo-client", version: "1.0.0" }, { capabilities: {} });

async function connect(): Promise<void> {
  await client.connect(transport);
  ok("✔ Conectado al servidor MCP.");
  blank();
}

async function cleanup(): Promise<void> {
  await client.close();
  rl.close();
}

//Devuelve la lista de tablas reutilizando la Tool existente.
async function fetchTables(): Promise<string[]> {
  const result = await client.callTool({ name: "db.list_tables", arguments: {} });
  const text = extractText(result);
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function printTables(tables: string[]): void {
  ok("   Available tables:");
  tables.forEach((t) => ok(`     - ${t}`));
  blank();
}

//1. Descubrir Tools
async function actionDiscoverTools(): Promise<void> {
  sep();
  opType("🔍 DISCOVERY");
  opName("client.listTools()");
  note("Estamos pidiendo al servidor '¿qué Tools me ofreces?'. Es descubrimiento, no ejecución.");
  blank();

  const result = (await client.listTools()) as { tools?: { name: string; description?: string }[] };
  ok("   Available tools:");
  (result.tools ?? []).forEach((t) =>
    ok(`     - ${t.name}${t.description ? `     (${t.description})` : ""}`)
  );
  blank();

  rawResponse(result);
}

//2. Listar tablas
async function actionListTables(): Promise<void> {
  sep();
  opType("🔧 TOOL CALL");
  opName("db.list_tables");
  note("Esta Tool no recibe parámetros, solo consulta las tablas existentes en SQLite.");
  blank();

  const result = await client.callTool({ name: "db.list_tables", arguments: {} });
  const tables = extractText(result)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  ok("   Result:");
  tables.forEach((t) => ok(`     - ${t}`));
  blank();
}

//3. Describir tabla
async function actionDescribeTable(): Promise<void> {
  sep();
  opType("🔧 TOOL CALL");
  opName("db.describe_table");
  note("Necesita el nombre de una tabla y devuelve su estructura (CREATE + columnas).");
  blank();

  const tables = await fetchTables();
  printTables(tables);

  const tableName = await question("   Nombre de tabla: ");
  if (!tableName) {
    warn("   Cancelado. Volviendo al menú...");
    blank();
    return;
  }

  blank();
  note("   Input:");
  ok(`     tableName = ${tableName}`);
  blank();

  try {
    const result = await client.callTool({ name: "db.describe_table", arguments: { tableName } });
    ok("   Result:");
    printMCPResult(result);
  } catch (err) {
    fail("   ❌ " + (err as Error).message);
    blank();
  }
}

//4. Query
async function actionQuery(): Promise<void> {
  sep();
  opType("🔧 TOOL CALL");
  opName("db.query");
  note("Ejecuta consultas de SOLO LECTURA en la base de datos.");
  note("   Read-only SQL. Ejemplos:");
  note("     SELECT * FROM users LIMIT 5;");
  note("     SELECT name, price FROM products;");
  blank();

  const sql = await question("   SQL a ejecutar: ");
  if (!sql) {
    warn("   Cancelado. Volviendo al menú...");
    blank();
    return;
  }

  blank();
  note("   Input:");
  ok(`     sql = ${sql}`);
  blank();

  try {
    const result = await client.callTool({ name: "db.query", arguments: { sql } });
    ok("   Result:");
    printMCPResult(result);
  } catch (err) {
    fail("   ❌ " + (err as Error).message);
    blank();
  }
}

//5. Insert
async function actionInsert(): Promise<void> {
  sep();
  opType("🔧 TOOL CALL");
  opName("db.insert");
  note("Inserta una fila en SQLite. No es de solo lectura: modifica la base de datos.");
  blank();

  const tables = await fetchTables();
  printTables(tables);

  const table = await question("   Tabla destino: ");
  if (!table) {
    warn("   Cancelado. Volviendo al menú...");
    blank();
    return;
  }
  const rowInput = await question('   Fila como JSON (ej: {"name":"X","price":9.99}): ');
  if (!rowInput) {
    warn("   Cancelado. Volviendo al menú...");
    blank();
    return;
  }

  let row: Record<string, unknown>;
  try {
    row = JSON.parse(rowInput) as Record<string, unknown>;
  } catch {
    fail("   ❌ La fila debe ser JSON válido.");
    blank();
    return;
  }

  blank();
  note("   Input:");
  ok(`     table = ${table}`);
  ok(`     row   = ${JSON.stringify(row)}`);
  blank();

  try {
    const result = await client.callTool({ name: "db.insert", arguments: { table, row } });
    ok("   Result:");
    printMCPResult(result);
  } catch (err) {
    fail("   ❌ " + (err as Error).message);
    blank();
  }
}

//6. Export CSV
async function actionExportCsv(): Promise<void> {
  sep();
  opType("🔧 TOOL CALL");
  opName("db.export_csv");
  note("Esta operación ejecuta una Tool que genera los datos de una tabla en formato CSV.");
  note("Importante: es una Tool (acción) que produce el CSV como texto resultante.");
  blank();

  const tables = await fetchTables();
  printTables(tables);

  const table = await question("   Tabla a exportar: ");
  if (!table) {
    warn("   Cancelado. Volviendo al menú...");
    blank();
    return;
  }

  blank();
  note("   Input:");
  ok(`     table = ${table}`);
  blank();

  try {
    const result = await client.callTool({ name: "db.export_csv", arguments: { table } });
    ok("   Result (CSV generado por la Tool):");
    printMCPResult(result);
  } catch (err) {
    fail("   ❌ " + (err as Error).message);
    blank();
  }
}

//7. Descubrir Resources
async function actionDiscoverResources(): Promise<void> {
  sep();
  opType("🔍 RESOURCE DISCOVERY");
  opName("client.listResources()");
  note("Estamos pidiendo al servidor '¿qué Resources me ofreces?'. No ejecutamos nada aún.");
  blank();

  const result = (await client.listResources()) as {
    resources?: { uri: string; description?: string }[];
  };
  ok("   Resources available:");
  (result.resources ?? []).forEach((r) => ok(`     ${r.uri}`));
  blank();

  rawResponse(result);
}

//8. Leer schema
async function actionReadSchema(): Promise<void> {
  sep();
  opType("📚 RESOURCE READ");
  opName("db://schema");
  note("Aquí NO ejecutamos una Tool. Accedemos a un Resource de solo contenido.");
  note("El servidor expone el esquema de la base como un dato que podemos leer directamente.");
  blank();

  try {
    const result = await client.readResource({ uri: "db://schema" });
    ok("   Result:");
    printMCPResult(result);
  } catch (err) {
    fail("   ❌ " + (err as Error).message);
    blank();
  }
}

//9. Leer Resource de una tabla
async function actionReadTableResource(): Promise<void> {
  sep();
  opType("📚 RESOURCE READ");
  note("Aquí no estamos llamando a una Tool que ejecuta una acción.");
  note("Estamos accediendo directamente a un Resource expuesto por el MCP Server.");
  note("Compara con la opción 6 (db.export_csv): ambas pueden mostrar contenido tipo CSV,");
  note(
    "pero el Resource se lee como dato (db://table/x), mientras que la Tool se ejecuta (db.export_csv)."
  );
  blank();

  const tables = await fetchTables();
  printTables(tables);

  const tableName = await question("   Nombre de tabla: ");
  if (!tableName) {
    warn("   Cancelado. Volviendo al menú...");
    blank();
    return;
  }

  blank();
  note("   Input:");
  ok(`     uri = db://table/${tableName}`);
  blank();

  try {
    const result = await client.readResource({ uri: `db://table/${tableName}` });
    ok("   Result:");
    printMCPResult(result);
  } catch (err) {
    fail("   ❌ " + (err as Error).message);
    blank();
  }
}

async function showMenu(): Promise<void> {
  let running = true;
  while (running) {
    console.log(`${C.bright}=== Menú Principal ===${C.reset}`);
    console.log(`${C.cyan}[1]${C.reset} Descubrir Tools`);
    console.log(`${C.cyan}[2]${C.reset} Listar tablas`);
    console.log(`${C.cyan}[3]${C.reset} Describir una tabla`);
    console.log(`${C.cyan}[4]${C.reset} Ejecutar query SELECT`);
    console.log(`${C.cyan}[5]${C.reset} Insertar registro`);
    console.log(`${C.cyan}[6]${C.reset} Exportar tabla a CSV`);
    console.log(`${C.cyan}[7]${C.reset} Descubrir Resources`);
    console.log(`${C.cyan}[8]${C.reset} Leer schema`);
    console.log(`${C.cyan}[9]${C.reset} Leer Resource de una tabla`);
    console.log(`${C.cyan}[0]${C.reset} ${C.red}Salir${C.reset}`);
    sep();

    const choice = await question("   Elige una opción: ");
    blank();

    try {
      switch (choice) {
        case "1":
          await actionDiscoverTools();
          break;
        case "2":
          await actionListTables();
          break;
        case "3":
          await actionDescribeTable();
          break;
        case "4":
          await actionQuery();
          break;
        case "5":
          await actionInsert();
          break;
        case "6":
          await actionExportCsv();
          break;
        case "7":
          await actionDiscoverResources();
          break;
        case "8":
          await actionReadSchema();
          break;
        case "9":
          await actionReadTableResource();
          break;
        case "0":
          warn("   Saliendo...");
          running = false;
          break;
        default:
          fail("   Opción no válida. Intenta de nuevo.");
      }
    } catch (err) {
      fail("   ❌ (excepción del cliente) " + (err as Error).message);
      blank();
    }
  }
}

async function main(): Promise<void> {
  try {
    banner();
    await connect();
    await showMenu();
  } catch (err) {
    fail("   ❌ Error fatal: " + (err as Error).message);
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error("Client error:", err);
  process.exit(1);
});
