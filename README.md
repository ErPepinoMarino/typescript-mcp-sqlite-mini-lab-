# typescript-mcp-sqlite-lab

Proyecto personal de aprendizaje autodidacta para explorar el **Model Context Protocol (MCP)** implementando un MCP Server SQLite desde cero en TypeScript.

## ¿Qué es esto?

Un **MCP Server** local que expone capacidades para explorar y manipular una base de datos SQLite. El flujo es:

```
MCP Client
    ↓
MCP Server
    ↓
SQLite Database
```

Sin APIs de pago, sin OpenAI, sin LLM. Todo local. El objetivo es comprender MCP de forma práctica, desacoplando el protocolo de la inteligencia artificial.

## ¿Qué hace?

Actualmente expone dos **Tools** via el protocolo MCP:

- **`db.list_tables`** — Lista todas las tablas de la base de datos SQLite
- **`db.describe_table`** — Describe el esquema de una tabla concreta (columnas, tipos, restricciones, claves)

### Cómo se usa

Se conecta a un **MCP Client** compatible (como Claude Desktop o un cliente custom). El cliente:

1. Inicia el handshake `initialize` con el servidor
2. Descubre las capabilities y tools disponibles via `listTools()`
3. Invoca tools via `callTool({ name, arguments })`

### Ejemplo de interacción

```
Cliente → initialize → Server responde con serverInfo y capabilities
Cliente → listTools → [db.list_tables, db.describe_table]
Cliente → callTool({ name: "db.list_tables", arguments: {} })
→ "orders, products, users"
Cliente → callTool({ name: "db.describe_table", arguments: { tableName: "users" } })
→ "CREATE TABLE users (...), Columns: id (INTEGER) PRIMARY KEY..."
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

### ¿Por qué MCP y no Function Calling?

| | Function Calling | MCP |
|---|---|---|
| **Acoplado a** | Una LLM específica | Independiente de LLM |
| **Transporte** | Dentro del contexto del modelo | Protocolo estándar (stdio/HTTP) |
| **Descubrimiento** | El modelo decide | El Cliente descubre capabilities |
| **Desacoplado** | ❌ Funciona solo con OpenAI | ✅ Funciona con cualquier Host MCP |

MCP es un protocolo estándar para que cualquier cliente pueda invocar herramientas externas sin depender de un LLM.

## Conceptos MCP

| Concepto | Qué es |
|---|---|
| **MCP Host** | La aplicación que orquesta todo |
| **MCP Client** | Se conecta al servidor, descubre capabilities, invoca tools |
| **MCP Server** | Expone Tools, Resources y Prompts |
| **Tool** | Una función invocable (ej: `db.list_tables`) |
| **Resource** | Un URI legible (ej: `db://schema`) — próximamente |
| **Prompt** | Un template parametrizado — opcional |
| **Capability** | Lo que una parte anuncia que puede hacer |

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
    ├── connection.ts         → Singleton de conexión SQLite (getDB)
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

## Decisiones técnicas

### ¿Por qué McpServer y no Server?

La clase `Server` está marcada como deprecated en `@modelcontextprotocol/sdk@1.30.0`. `McpServer` es la API moderna de alto nivel con `registerTool`, `registerResource`, `registerPrompt`.

### ¿Por qué Stdio como transporte?

Para un servidor local sin LLM, stdio es el más simple. El cliente lanza el servidor como subproceso y se comunica por stdin/stdout. No requiere HTTP, autenticación, ni nada externo.

### ¿Por qué better-sqlite3?

API síncrona, sin callbacks ni promesas. Más simple de entender para aprendizaje. Sin ORM, sin abstracciones innecesarias.

### ¿Por qué Zod para los schemas de Tools?

El SDK de MCP está construido alrededor de zod. Define el `inputSchema` que el SDK usa para:
1. **Validar** los argumentos que llegan del cliente
2. **Generar** el JSON Schema que anuncia en `listTools()`

No es un añadido opcional — es la mecánica nativa del protocolo.

### ¿Por qué no usamos Resources ni Prompts todavía?

Se introducen progresivamente cuando tienen sentido:
- **Resources** se usan cuando queremos exponer datos como URIs legibles (no solo accionables). Se implementarán cuando sea claro que una tabla de la BD se beneficia de ser un recurso descubierto.
- **Prompts** son templates parametrizados para el cliente. No aportan valor en un servidor de BD puro donde las tools ya cubren la funcionalidad.

### ¿Qué NO se usa y por qué?

| No se usa | Razón |
|---|---|
| ORM | El objetivo es MCP, no abstraer la BD |
| OpenAI / LLM | MCP es independiente de IA |
| Docker | No hay servicio externo |
| LangChain | No es un pipeline RAG |
| Autenticación | Local, sin red expuesta |

## Estado actual

- ✅ Proyecto TypeScript configurado (ESM, Node 24)
- ✅ ESLint v10 flat config + Prettier
- ✅ Vitest funcionando
- ✅ Base de datos SQLite con 3 tablas (users, products, orders)
- ✅ MCP Server con `McpServer` + `StdioServerTransport`
- ✅ Tool `db.list_tables` implementada y probada
- ✅ Tool `db.describe_table` implementada y probada (con Zod + validación de nombre de tabla)
- ✅ Cliente MCP local que descubre y llama tools sin LLM
- 🔜 Más tools (`db.query`, `db.insert`, `db.export_csv`)
- 🔜 Resources (`db://schema`, `db://table/<name>`)
- 🔜 Tests para Tools y validación
