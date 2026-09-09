//Creamos la bdd mas simple del mundo, no necesitamos más.
import Database from "better-sqlite3";
import { existsSync } from "node:fs";

const dbPath = "./database.sqlite";

const SCHEMA_SQL = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL CHECK(price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`;

const SEED_SQL = `
  INSERT INTO users (name, email) VALUES ('Pepe', 'pepe@example.com');
  INSERT INTO users (name, email) VALUES ('Vicenta', 'vicenta@example.com');
  INSERT INTO users (name, email) VALUES ('Antonio', 'antonio@example.com');
  INSERT INTO users (name, email) VALUES ('María', 'maria@example.com');

  INSERT INTO products (name, description, price, stock) VALUES ('El Color que Cayó del Cielo', 'Horror cósmico de H.P. Lovecraft', 9.99, 100);
  INSERT INTO products (name, description, price, stock) VALUES ('La Sombra de Innsmouth', 'Horror cósmico de H.P. Lovecraft', 12.50, 50);
  INSERT INTO products (name, description, price, stock) VALUES ('La Llamada de Cthulhu', 'Horror cósmico de H.P. Lovecraft', 9.99, 75);
  INSERT INTO products (name, description, price, stock) VALUES ('El Problema de los Tres Cuerpos', 'Ciencia ficción de Cixin Liu', 15.99, 60);
  INSERT INTO products (name, description, price, stock) VALUES ('Dune', 'Ciencia ficción de Frank Herbert', 18.99, 40);
  INSERT INTO products (name, description, price, stock) VALUES ('Solaris', 'Ciencia ficción de Stanisław Lem', 11.99, 35);

  INSERT INTO orders (user_id, status, total) VALUES (1, 'pending', 24.99);
  INSERT INTO orders (user_id, status, total) VALUES (2, 'completed', 12.50);
  INSERT INTO orders (user_id, status, total) VALUES (3, 'pending', 45.00);
  INSERT INTO orders (user_id, status, total) VALUES (4, 'shipped', 9.99);
  INSERT INTO orders (user_id, status, total) VALUES (1, 'completed', 30.00);
  INSERT INTO orders (user_id, status, total) VALUES (2, 'pending', 18.75);
`;

export function createSchema(db: Database.Database): void {
  db.exec(SCHEMA_SQL);
}

export function seed(db: Database.Database): void {
  db.exec(SEED_SQL);
}

function initializeDatabase(): void {
  if (!existsSync(dbPath)) {
    const db = new Database(dbPath);
    createSchema(db);
    seed(db);
    db.close();
    console.log("Database initialized at", dbPath);
  }
}

initializeDatabase();
