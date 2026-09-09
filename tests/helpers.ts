import Database from "better-sqlite3";
import { createSchema, seed } from "../src/db/init.js";
//Este es el helper que crea la bdd que vamos a usar para los tests
//Evidentemente no usaremos la real.
export function buildDb(): Database.Database {
  const db = new Database(":memory:");
  createSchema(db);
  seed(db);
  return db;
}

export function textOf(result: { content?: { text?: string }[] }): string {
  return (result.content ?? []).map((c) => c.text ?? "").join("\n");
}
