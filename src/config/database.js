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

// Run a startup check to ensure the is_read column exists in the chat_message table
pool.query("ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;")
  .then(() => console.log("Database schema check: 'is_read' column in 'chat_message' table verified/added."))
  .catch((err) => console.error("Database schema check for is_read failed:", err.message));

module.exports = pool;