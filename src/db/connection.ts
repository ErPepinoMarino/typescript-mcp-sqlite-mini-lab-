import Database from "better-sqlite3";

const db = new Database("./database.sqlite");

export function getDB(): Database.Database {
  return db;
}
