import { getDB } from "./connection.js";

const db = getDB();

console.log("Conteo de Users:", db.prepare("SELECT COUNT(*) as count FROM users").get());
console.log("Conteo de Products:", db.prepare("SELECT COUNT(*) as count FROM products").get());
console.log("Conteo de Orders:", db.prepare("SELECT COUNT(*) as count FROM orders").get());

console.log("\n=== Todos los Usuarios ===");
console.table(db.prepare("SELECT * FROM users").all());

console.log("\n=== Todos los Productos ===");
console.table(db.prepare("SELECT * FROM products").all());

console.log("\n=== Todas las Órdenes ===");
console.table(db.prepare("SELECT * FROM orders").all());

db.close();
