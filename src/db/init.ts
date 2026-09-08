//Creamos la bdd mas simple del mundo, no necesitamos más.
import Database from "better-sqlite3";
import { existsSync } from "node:fs";

const dbPath = "./database.sqlite";

function initializeDatabase(): void {
  if (!existsSync(dbPath)) {
    const db = new Database(dbPath);
    db.exec(`
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

      INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
      INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');

      INSERT INTO products (name, description, price, stock) VALUES ('Widget A', 'Descripción del Widget A', 9.99, 100);
      INSERT INTO products (name, description, price, stock) VALUES ('Widget B', 'Descripción del Widget B', 19.99, 50);
      INSERT INTO products (name, description, price, stock) VALUES ('Widget C', 'Descripción del Widget C', 29.99, 25);

      INSERT INTO orders (user_id, status, total) VALUES (1, 'pending', 9.99);
      INSERT INTO orders (user_id, status, total) VALUES (2, 'completed', 19.99);
    `);
    db.close();
    console.log("Database initialized at", dbPath);
  }
}

initializeDatabase();
