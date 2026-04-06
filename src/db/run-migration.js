require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const sql = fs.readFileSync(
    path.join(__dirname, "migration.sql"),
    "utf-8"
  );

  console.log("Connecting to database...");
  const client = await pool.connect();

  try {
    console.log("Running migration...\n");
    await client.query(sql);
    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err.message);
    console.error("Detail:", err.detail || "none");
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
