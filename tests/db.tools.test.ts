import { describe, it, expect, afterEach } from "vitest";
import Database from "better-sqlite3";
import { buildDb, textOf } from "./helpers.js";
import { listTables, describeTable, query, insert, exportCsv } from "../src/db/operations.js";

let db: Database.Database;

afterEach(() => {
  db?.close();
});

describe("db.list_tables", () => {
  it("lista las tablas en orden alfabético", () => {
    db = buildDb();
    const result = listTables(db);
    expect(result).not.toHaveProperty("isError");
    expect(textOf(result)).toBe("orders, products, users");
  });
});

describe("db.describe_table", () => {
  it("describe una tabla existente", () => {
    db = buildDb();
    const result = describeTable(db, "users");
    const text = textOf(result);
    expect(result).not.toHaveProperty("isError");
    expect(text).toContain("Table: users");
    expect(text).toContain("CREATE TABLE users");
    expect(text).toContain("Columns:");
    expect(text).toContain("- name (TEXT) NOT NULL");
  });

  it("devuelve error si la tabla no existe", () => {
    db = buildDb();
    const result = describeTable(db, "nope");
    expect(result).toHaveProperty("isError", true);
    expect(textOf(result)).toBe("Table not found: nope");
  });

  it("rechaza un identificador de tabla inválido", () => {
    db = buildDb();
    const result = describeTable(db, "users; drop");
    expect(result).toHaveProperty("isError", true);
    expect(textOf(result)).toBe("Invalid table name: users; drop");
  });
});

describe("db.query", () => {
  it("ejecuta un SELECT válido", () => {
    db = buildDb();
    const result = query(db, "SELECT name FROM users ORDER BY id");
    const rows = JSON.parse(textOf(result)) as { name: string }[];
    expect(result).not.toHaveProperty("isError");
    expect(rows).toEqual([{ name: "Pepe" }, { name: "Vicenta" }, { name: "Antonio" }, { name: "María" }]);
  });

  it("rechaza una consulta de escritura", () => {
    db = buildDb();
    const result = query(db, "DELETE FROM users");
    expect(result).toHaveProperty("isError", true);
    expect(textOf(result)).toBe("Only read-only queries are allowed (SELECT, EXPLAIN, VALUES)");
  });
});

describe("db.insert", () => {
  it("inserta una fila válida", () => {
    db = buildDb();
    const result = insert(db, "products", { name: "Prueba", price: 5, stock: 1 });
    expect(result).not.toHaveProperty("isError");
    expect(textOf(result)).toMatch(/^Inserted into products\. lastInsertRowid: \d+, changes: 1$/);
    const count = db.prepare("SELECT COUNT(*) as c FROM products").get() as { c: number };
    expect(count.c).toBe(7);
  });

  it("rechaza columnas que no existen", () => {
    db = buildDb();
    const result = insert(db, "products", { nonexistent: 1 });
    expect(result).toHaveProperty("isError", true);
    expect(textOf(result)).toBe("Invalid columns: nonexistent");
  });

  it("rechaza un identificador de tabla inválido", () => {
    db = buildDb();
    const result = insert(db, "products; drop", { name: "x" });
    expect(result).toHaveProperty("isError", true);
    expect(textOf(result)).toBe("Invalid table name: products; drop");
  });
});

describe("db.export_csv", () => {
  it("exporta una tabla como CSV", () => {
    db = buildDb();
    const result = exportCsv(db, "products");
    const csv = textOf(result);
    expect(result).not.toHaveProperty("isError");
    const lines = csv.split("\n");
    expect(lines[0]).toBe("id,name,description,price,stock,created_at");
    expect(csv).toContain("El Color que Cayó del Cielo");
  });

  it("devuelve error si la tabla no existe", () => {
    db = buildDb();
    const result = exportCsv(db, "inventada");
    expect(result).toHaveProperty("isError", true);
    expect(textOf(result)).toBe("Table not found: inventada");
  });
});
