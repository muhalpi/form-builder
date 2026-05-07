import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new Pool({ connectionString: databaseUrl });

const LEGACY_USER_ID = "legacy-owner";
const LEGACY_EMAIL = "legacy-owner@formu.local";

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `
      INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
      VALUES ($1, $2, $3, false, now(), now())
      ON CONFLICT (id) DO NOTHING
      `,
      [LEGACY_USER_ID, "Legacy Owner", LEGACY_EMAIL],
    );

    const updateResult = await client.query(
      `
      UPDATE forms
      SET user_id = $1
      WHERE user_id IS NULL
      `,
      [LEGACY_USER_ID],
    );

    await client.query(`
      ALTER TABLE forms
      ALTER COLUMN user_id SET NOT NULL
    `);

    await client.query("COMMIT");
    console.log(
      `[migrate:forms-user-id] Updated ${updateResult.rowCount ?? 0} form row(s) and enforced NOT NULL.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

run()
  .catch((error) => {
    console.error("[migrate:forms-user-id] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
