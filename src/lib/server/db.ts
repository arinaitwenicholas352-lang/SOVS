import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "sovs_db";

export const db = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testConnection() {
  const connection = await db.getConnection();

  try {
    await connection.ping();
    console.log("✅ Connected to MySQL database");
  } finally {
    connection.release();
  }
}

export async function query(sql: string, params: any[] = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}

export async function get(sql: string, params: any[] = []) {
  const [rows] = await db.query(sql, params);
  const result = rows as any[];
  return result[0] || null;
}

export async function run(sql: string, params: any[] = []) {
  const [result] = await db.query(sql, params);

  return {
    insertId: (result as any).insertId,
    affectedRows: (result as any).affectedRows,
  };
}

export async function transaction(callback: (tx: any) => Promise<void>) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const tx = {
      query: async (sql: string, params: any[] = []) => {
        const [rows] = await connection.query(sql, params);
        return rows;
      },

      get: async (sql: string, params: any[] = []) => {
        const [rows] = await connection.query(sql, params);
        const result = rows as any[];
        return result[0] || null;
      },

      run: async (sql: string, params: any[] = []) => {
        const [result] = await connection.query(sql, params);

        return {
          insertId: (result as any).insertId,
          affectedRows: (result as any).affectedRows,
        };
      },
    };

    await callback(tx);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default db;