import type Database from "better-sqlite3";
import { isValidIdentifier } from "./validate.js";

type Col = { name: string; type: string; notnull: number; dflt_value: string | null; pk: number };
type Result =
  | { content: { type: "text"; text: string }[] }
  | { content: { type: "text"; text: string }[]; isError: true };
type ResourceResult = { contents: { uri: string; text: string; mimeType: string }[] };

const escapeCsv = (val: unknown): string => {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function listTables(db: Database.Database): Result {
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all() as { name: string }[];
  return { content: [{ type: "text", text: tables.map((t) => t.name).join(", ") }] };
}

export function describeTable(db: Database.Database, tableName: string): Result {
  if (!isValidIdentifier(tableName)) {
    return { content: [{ type: "text", text: `Invalid table name: ${tableName}` }], isError: true };
  }
  const createSql = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { sql: string } | undefined;
  if (!createSql) {
    return { content: [{ type: "text", text: `Table not found: ${tableName}` }], isError: true };
  }
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Col[];
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

export function query(db: Database.Database, sql: string): Result {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  const allowed = /^(select|explain|values)\b/i;
  if (!allowed.test(trimmed)) {
    return {
      content: [
        { type: "text", text: "Only read-only queries are allowed (SELECT, EXPLAIN, VALUES)" },
      ],
      isError: true,
    };
  }
  try {
    const rows = db.prepare(trimmed).all();
    return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Query error: ${(err as Error).message}` }],
      isError: true,
    };
  }
}

export function insert(db: Database.Database, table: string, row: Record<string, unknown>): Result {
  if (!isValidIdentifier(table)) {
    return { content: [{ type: "text", text: `Invalid table name: ${table}` }], isError: true };
  }
  const tableInfo = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  if (!tableInfo) {
    return { content: [{ type: "text", text: `Table not found: ${table}` }], isError: true };
  }
  const columns = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
    (c) => c.name
  );
  const keys = Object.keys(row);
  const invalid = keys.filter((k) => !columns.includes(k));
  if (invalid.length > 0) {
    return {
      content: [{ type: "text", text: `Invalid columns: ${invalid.join(", ")}` }],
      isError: true,
    };
  }
  if (keys.length === 0) {
    return {
      content: [{ type: "text", text: "Row must contain at least one column" }],
      isError: true,
    };
  }
  const placeholders = keys.map(() => "?").join(", ");
  const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;
  try {
    const values = keys.map((k) => row[k] as string | number | bigint | Buffer | null);
    const result = db.prepare(sql).run(...values);
    return {
      content: [
        {
          type: "text",
          text: `Inserted into ${table}. lastInsertRowid: ${result.lastInsertRowid}, changes: ${result.changes}`,
        },
      ],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Insert error: ${(err as Error).message}` }],
      isError: true,
    };
  }
}

export function exportCsv(db: Database.Database, table: string): Result {
  if (!isValidIdentifier(table)) {
    return { content: [{ type: "text", text: `Invalid table name: ${table}` }], isError: true };
  }
  const tableInfo = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  if (!tableInfo) {
    return { content: [{ type: "text", text: `Table not found: ${table}` }], isError: true };
  }
  const columns = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
    (c) => c.name
  );
  const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
  const header = columns.map(escapeCsv).join(",");
  const csvRows = rows.map((row) => columns.map((c) => escapeCsv(row[c])).join(","));
  return { content: [{ type: "text", text: [header, ...csvRows].join("\n") }] };
}

export function readSchema(db: Database.Database): ResourceResult {
  const tables = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all() as { sql: string }[];
  return {
    contents: [
      { uri: "db://schema", text: tables.map((t) => t.sql).join("\n\n"), mimeType: "text/plain" },
    ],
  };
}

export function readTableResource(
  db: Database.Database,
  uriHref: string,
  tableName: string
): ResourceResult {
  if (!tableName || !isValidIdentifier(tableName)) {
    return {
      contents: [
        { uri: uriHref, text: `Invalid table name: ${tableName}`, mimeType: "text/plain" },
      ],
    };
  }
  const tableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? AND name NOT LIKE 'sqlite_%'"
    )
    .get(tableName) as { name: string } | undefined;
  if (!tableExists) {
    return {
      contents: [{ uri: uriHref, text: `Table not found: ${tableName}`, mimeType: "text/plain" }],
    };
  }
  const columns = (db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[]).map(
    (c) => c.name
  );
  const rows = db.prepare(`SELECT * FROM ${tableName}`).all() as Record<string, unknown>[];
  const header = columns.map(escapeCsv).join(",");
  const csvRows = rows.map((row) => columns.map((c) => escapeCsv(row[c])).join(","));
  return {
    contents: [{ uri: uriHref, text: [header, ...csvRows].join("\n"), mimeType: "text/plain" }],
  };
}

export function listTableResources(db: Database.Database): {
  resources: { uri: string; name: string; mimeType: string; description: string }[];
} {
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all() as { name: string }[];
  return {
    resources: tables.map((t) => ({
      uri: `db://table/${t.name}`,
      name: t.name,
      mimeType: "text/plain",
      description: `Data from ${t.name} table`,
    })),
  };
}
