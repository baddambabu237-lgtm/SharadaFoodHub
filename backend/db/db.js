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
    try {
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
    } catch (err) {
      console.error(`[DATABASE ERROR] [run] Query: "${sql}" | Params: ${JSON.stringify(params)} | Error:`, err);
      throw err;
    }
  },

  async get(sql, params = []) {
    try {
      let pgSql = sql;
      let index = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${index++}`);
      const res = await pool.query(pgSql, params);
      return res.rows[0] || null;
    } catch (err) {
      console.error(`[DATABASE ERROR] [get] Query: "${sql}" | Params: ${JSON.stringify(params)} | Error:`, err);
      throw err;
    }
  },

  async all(sql, params = []) {
    try {
      let pgSql = sql;
      let index = 1;
      pgSql = pgSql.replace(/\?/g, () => `$${index++}`);
      const res = await pool.query(pgSql, params);
      return res.rows;
    } catch (err) {
      console.error(`[DATABASE ERROR] [all] Query: "${sql}" | Params: ${JSON.stringify(params)} | Error:`, err);
      throw err;
    }
  },

  async exec(sql) {
    try {
      return await pool.query(sql);
    } catch (err) {
      console.error(`[DATABASE ERROR] [exec] Query: "${sql}" | Error:`, err);
      throw err;
    }
  }
};

module.exports = { db: pool, query };
