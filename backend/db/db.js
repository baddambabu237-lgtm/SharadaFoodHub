const { Pool } = require('pg');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper functions to wrap pg with the same interface as our old sqlite3 wrapper
const query = {
  async run(sql, params = []) {
    let pgSql = sql;
    let index = 1;
    // Replace ? with $1, $2, etc.
    pgSql = pgSql.replace(/\?/g, () => `$${index++}`);

    // If it's an insert, try to return the ID so the old interface works
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING id';
    }

    const res = await pool.query(pgSql, params);
    
    let id = null;
    if (res.rows && res.rows.length > 0 && res.rows[0].id) {
      id = res.rows[0].id;
    }

    return { id, changes: res.rowCount };
  },

  async get(sql, params = []) {
    let pgSql = sql;
    let index = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${index++}`);
    const res = await pool.query(pgSql, params);
    return res.rows[0] || null;
  },

  async all(sql, params = []) {
    let pgSql = sql;
    let index = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${index++}`);
    const res = await pool.query(pgSql, params);
    return res.rows;
  },

  async exec(sql) {
    return await pool.query(sql);
  }
};

module.exports = { db: pool, query };
