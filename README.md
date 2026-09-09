# typescript-mcp-sqlite-lab

Pequeño lab de aprendizaje para explorar el **Model Context Protocol (MCP)** implementando un MCP Server SQLite desde cero en TypeScript.

## ¿Qué es esto?

Un **MCP Server** local que expone capacidades para explorar y manipular una base de datos SQLite. El flujo es:

```
MCP Client
    ↓
MCP Server
    ↓
SQLite Database
```

## ¿Qué hace?

Actualmente expone tres **Tools** via el protocolo MCP:
- **`db.list_tables`** — Lista todas las tablas de la base de datos SQLite
- **`db.describe_table`** — Describe el esquema de una tabla concreta (columnas, tipos, restricciones, claves)
- **`db.query`** — Ejecuta una consulta de solo lectura (SELECT)

### Cómo se usa

Se conecta a un **MCP Client** compatible (como Claude Desktop o un cliente custom). El cliente:
1. Inicia el handshake `initialize` con el servidor
2. Descubre las capabilities y tools disponibles via `listTools()`
3. Invoca tools via `callTool({ name, arguments })`

### Ejemplo de interacción

```
Cliente → initialize → Server responde con serverInfo y capabilities
Cliente → listTools → [db.list_tables, db.describe_table, db.query]
Cliente → callTool({ name: "db.list_tables", arguments: {} })
→ "orders, products, users"
Cliente → callTool({ name: "db.describe_table", arguments: { tableName: "users" } })
→ "CREATE TABLE users (...), Columns: id (INTEGER) PRIMARY KEY..."
Cliente → callTool({ name: "db.query", arguments: { sql: "SELECT * FROM products" } })
→ "[{id:1, name:"Widget A", ...}]"
```

## Arquitectura MCP

### Flujo general

```
┌─────────────────┐
│    MCP Client   │
└────────┬────────┘
         │ MCP
         ↓
┌─────────────────┐
│    MCP Server   │
├─────────────────┤
│   Tools         │  ← db.list_tables
│                 │  ← db.describe_table
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ SQLite Database │
└─────────────────┘
```

### Tool call

```
Client
 ↓
tools/call { name, arguments }
 ↓
MCP Server
 ↓
valida contra schema (Zod)
 ↓
ejecuta en SQLite
 ↓
devuelve CallToolResult con content blocks
```

### Resource access (futuro)

```
Client
 ↓
resources/read { uri }
 ↓
MCP Server
 ↓
devuelve Resource content
```

## Stack

- **TypeScript + Node.js v24** (ESM nativo)
- **@modelcontextprotocol/sdk v1.30.0** (`McpServer` + `StdioServerTransport`)
- **better-sqlite3** — base de datos SQLite síncrona
- **zod** — validación de schemas para Tools
- **Vitest** — framework de tests
- **ESLint v10** (flat config) + **Prettier** — calidad de código

## Estructura del proyecto

```
src/
├── index.ts                  → Entry point del servidor MCP (McpServer)
├── client.ts                 → Cliente MCP local (para pruebas)
└── db/
    ├── connection.ts         → Singleton de conexión SQLite (getDB, getReadOnlyDB)
    ├── init.ts               → Inicialización: schema + datos seed
    └── verify.ts             → Verificación manual de la base de datos
tests/
└── smoke.test.ts             → Prueba mínima del entorno
dist/                         → Código compilado (generado por tsc)
database.sqlite               → Base de datos SQLite (en .gitignore)
```

## Setup

```bash
npm install
npm run build
npm test
npm start          → ejecuta el servidor MCP
npm run client     → ejecuta el cliente local de prueba
```

### Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Ejecuta el servidor MCP (node dist/index.js) |
| `npm run client` | Ejecuta el cliente local de prueba |
| `npm test` | Ejecuta los tests con Vitest |
| `npm run build` | Compila TypeScript |
| `npm run lint` | Lint con ESLint |
| `npm run format` | Formatea con Prettier |
