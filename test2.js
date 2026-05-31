const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_1wSTkUcgXrQ7@ep-wild-queen-a4gk47k4-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require' });
client.connect().then(() => {
  return client.query("SELECT pg_get_constraintdef(oid), conname FROM pg_constraint WHERE conname IN ('chat_message_type_check', 'chat_message_sender_role_check')");
}).then(res => {
  console.log(res.rows);
  client.end();
}).catch(err => {
  console.error(err);
  client.end();
});
