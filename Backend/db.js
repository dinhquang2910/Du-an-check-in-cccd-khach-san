// const sql = require("mssql/msnodesqlv8");

// const config = {
//   server: "localhost\\SQLEXPRESS",
//   database: "checkin",
//   driver: "ODBC Driver 18 for SQL Server",
//   options: {
//     trustedConnection: true,
//     trustServerCertificate: true,
//   },
// };

// const poolPromise = sql.connect(config);

// module.exports = {
//   sql,
//   poolPromise,
// };

require("dotenv").config();
const { Pool } = require("pg");

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "checkin",
      ssl:
        process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    });

pool.on("error", (err) => {
  console.error("Lỗi kết nối PostgreSQL pool:", err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
