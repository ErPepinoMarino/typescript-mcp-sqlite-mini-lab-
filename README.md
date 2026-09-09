# typescript-mcp-sqlite-lab

Pequeño lab de aprendizaje para explorar el **Model Context Protocol (MCP)** implementando un MCP Server SQLite desde cero en TypeScript.

## ¿Qué es esto?

Básicamente es un **MCP Server** local que permite explorar y manipular una pequeña base de datos SQLite. El flujo es:

```
MCP Client
    ↓
MCP Server
    ↓
SQLite Database
```

## ¿Qué hace?

Actualmente expone cinco **Tools** via el protocolo MCP:

- **`db.list_tables`** — Lista todas las tablas de la base de datos SQLite
- **`db.describe_table`** — Describe el esquema de una tabla concreta (columnas, tipos, restricciones, claves)
- **`db.query`** — Ejecuta una consulta de solo lectura (SELECT)
- **`db.insert`** — Inserta una fila en una tabla de forma controlada
- **`db.export_csv`** — Exporta los datos de una tabla a formato CSV

Además de las Tools, el servidor expone **Resources** (contenido accesible por URI):

- **`db://schema`** — Resource estático con el esquema completo de la base de datos (CREATE TABLE)
- **`db://table/{tableName}`** — Resource dinámico mediante `ResourceTemplate` que devuelve el contenido de una tabla concreta como CSV

```text
db://schema          → CREATE TABLE de todas las tablas
db://table/users     → datos de la tabla users
db://table/products  → datos de la tabla products
```

> Esto es gracioso. En la teoria una **Tool** ejecuta una acción (`callTool`); y un **Resource** se lee como contenido (`readResource`). Pero por debajo vienen a ser lo mismo.

### Cómo se usa

Se conecta a un **MCP Client** compatible (como Claude Desktop o un cliente custom). El cliente:

1. Inicia el handshake `initialize` con el servidor
2. Descubre las capabilities y tools disponibles via `listTools()`
3. Invoca tools via `callTool({ name, arguments })`

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
│                 │  ← db.query
│                 │  ← db.insert
│                 │  ← db.export_csv
│   Resources     │  ← db://schema
│                 │  ← db://table/{tableName}
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

### Resource read

```
Client
 ↓
resources/read { uri }
 ↓
MCP Server
 ↓
devuelve Resource content
```

## Demo interactivo

El proyecto incluye un cliente MCP interactivo (`src/demo.ts`) que arranca `StdioClientTransport` y muestra un menú para probar varias opciones, a saber:

1. Descubrir Tools (`listTools`)
2. Listar tablas (`db.list_tables`)
3. Describir una tabla (`db.describe_table`)
4. Ejecutar query SELECT (`db.query`)
5. Insertar registro (`db.insert`)
6. Exportar tabla a CSV (`db.export_csv`)
7. Descubrir Resources (`listResources`)
8. Leer schema (`db://schema`)
9. Leer Resource de una tabla (`db://table/{tableName}`)
10. Salir

Cada opción indica el tipo de operación MCP (Tool Call o Resource Read/Discovery).

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
├── client.ts                 → Cliente MCP local de prueba directo
├── demo.ts                   → Cliente/demo interactivo (menú didáctico)
└── db/
    ├── connection.ts         → Singleton de conexión SQLite (getDB, getReadOnlyDB)
    ├── operations.ts         → Lógica pura de tools/resources (recibe la conexión por parámetro)
    ├── init.ts               → Inicialización: schema + datos seed (createSchema, seed)
    ├── validate.ts           → Validación de identificadores (isValidIdentifier)
    └── verify.ts             → Verificación manual de la base de datos
tests/
├── helpers.ts                → Construcción de una BD SQLite en memoria para tests
├── smoke.test.ts             → Prueba mínima del entorno
├── db.tools.test.ts          → Tests de las 5 Tools
├── db.resources.test.ts      → Tests de los 2 Resources
└── validate.test.ts          → Tests de isValidIdentifier
dist/                         → Código compilado (generado por tsc)
database.sqlite               → Base de datos SQLite (en .gitignore)
```

## Testing

Los tests, que ha implementado en un 99% el agente, usan **Vitest** y se ejecutan con `npm test`. Están diseñados para ser deterministas y rápidos:

- **Aislamiento:** se construye una **BD SQLite en memoria** (`:memory:`) en cada test reutilizando `createSchema()`/`seed()` de `src/db/init.ts`. No dependen del archivo `database.sqlite`, ni de servicios externos, ni de un MCP Client real, ni de APIs de OpenAI.
- **Cobertura de comportamiento:**
  - `db.tools.test.ts` — `list_tables`, `describe_table` (válida / no existe / id inválido), `query` (SELECT válido + escritura rechazada), `insert` (válido / columnas inválidas / id inválido), `export_csv` (válido / no existe).
  - `db.resources.test.ts` — `db://schema` y `db://table/{tableName}` (leer válido / listar recursos / id inválido / no existe).
  - `validate.test.ts` — `isValidIdentifier` (casos válidos e inválidos).

## Setup

```bash
npm install
npm run build
npm test
npm start          → ejecuta el servidor MCP
npm run client     → ejecuta el cliente local de prueba
npm run demo       → ejecuta el cliente/demo interactivo
```

### Scripts

| Comando          | Descripción                                  |
| ---------------- | -------------------------------------------- |
| `npm start`      | Ejecuta el servidor MCP (node dist/index.js) |
| `npm run client` | Ejecuta el cliente local de prueba           |
| `npm run demo`   | Ejecuta el cliente/demo interactivo          |
| `npm test`       | Ejecuta los tests con Vitest                 |
| `npm run build`  | Compila TypeScript                           |
| `npm run lint`   | Lint con ESLint                              |
| `npm run format` | Formatea con Prettier                        |
