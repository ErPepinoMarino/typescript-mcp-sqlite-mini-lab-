//Tests interesantes y necesarios que si no fuera por el agente no haría.
import { describe, it, expect, afterEach } from "vitest";
import Database from "better-sqlite3";
import { buildDb } from "./helpers.js";
import { readSchema, readTableResource, listTableResources } from "../src/db/operations.js";

let db: Database.Database;

afterEach(() => {
  db?.close();
});

describe("db://schema", () => {
  it("devuelve el esquema completo de la base de datos", () => {
    db = buildDb();
    const result = readSchema(db);
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].uri).toBe("db://schema");
    expect(result.contents[0].mimeType).toBe("text/plain");
    expect(result.contents[0].text).toContain("CREATE TABLE users");
    expect(result.contents[0].text).toContain("CREATE TABLE products");
    expect(result.contents[0].text).toContain("CREATE TABLE orders");
  });
});

describe("db://table/{tableName}", () => {
  it("expone la lista de recursos de tablas", () => {
    db = buildDb();
    const result = listTableResources(db);
    const uris = result.resources.map((r) => r.uri);
    expect(uris).toEqual(["db://table/orders", "db://table/products", "db://table/users"]);
  });

  it("lee el contenido de una tabla existente", () => {
    db = buildDb();
    const result = readTableResource(db, "db://table/users", "users");
    expect(result.contents[0].uri).toBe("db://table/users");
    const csv = result.contents[0].text;
    expect(csv.split("\n")[0]).toBe("id,name,email,created_at");
    expect(csv).toContain("Pepe");
  });

  it("rechaza un identificador de tabla inválido", () => {
    db = buildDb();
    const result = readTableResource(db, "db://table/invalid", "users; drop");
    expect(result.contents[0].text).toBe("Invalid table name: users; drop");
  });

  it("devuelve error si la tabla no existe", () => {
    db = buildDb();
    const result = readTableResource(db, "db://table/xt", "xt");
    expect(result.contents[0].text).toBe("Table not found: xt");
  });
});
