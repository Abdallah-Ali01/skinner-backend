const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false }
});

// Run a startup check to ensure the age column exists in the doctor table
pool.query("ALTER TABLE doctor ADD COLUMN IF NOT EXISTS age INTEGER;")
  .then(() => console.log("Database schema check: 'age' column in 'doctor' table verified/added."))
  .catch((err) => console.error("Database schema check failed:", err.message));

module.exports = pool;