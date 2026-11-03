import mysql from 'mysql2/promise';

const shared = globalThis;
export function db() {
  if (!shared.__xunfuDb) shared.__xunfuDb = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'xunfu', password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'xunfu',
    waitForConnections: true, connectionLimit: 5, queueLimit: 30, charset: 'utf8mb4', decimalNumbers: true,
  });
  return shared.__xunfuDb;
}
export async function query(sql, values = []) { const [rows] = await db().execute(sql, values); return rows; }
export function json(value, fallback = []) { if (value == null) return fallback; if (typeof value === 'string') { try { return JSON.parse(value); } catch { return fallback; } } return value; }
export function record(row) {
  if (!row) return null;
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    if (['password_hash','api_key'].includes(key)) continue;
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = ['tags','skills','starred_by','hidden_by'].includes(key) ? json(value) : value;
  }
  if ('city' in row) result.location = row.city;
  if ('hide_title' in row) result.hideTitle = Boolean(row.hide_title);
  if ('user_id' in row && ('category' in row)) result.ownerId = row.user_id;
  if ('prompt_tokens' in row) result.totalTokens = Number(row.prompt_tokens || 0) + Number(row.completion_tokens || 0);
  if ('budget' in row && row.status === 'open') result.status = 'active';
  if ('price' in row && row.status === 'archived') result.status = 'closed';
  return result;
}
