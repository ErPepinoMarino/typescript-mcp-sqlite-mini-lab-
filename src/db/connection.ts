import Database from "better-sqlite3";

const db = new Database("./database.sqlite");
const readOnlyDb = new Database("./database.sqlite", { readonly: true });

export function getDB(): Database.Database {
  return db;
}
//Importante segregar ambas acciones para evitar que nos traten de inyectar sql en tools de lectura.
export function getReadOnlyDB(): Database.Database {
  return readOnlyDb;
}
