const path = require('node:path');
require('dotenv').config({ quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';
const mainName = process.env.DB_NAME || 'digital_store_backend';
const testName = process.env.DB_NAME_TEST || 'digital_store_backend_test';

function integer(name, fallback) {
  const value = process.env[name] ?? String(fallback);
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error(`${name} deve ser uma porta entre 1 e 65535.`);
  }
  return Number(value);
}

function assertTestDatabase() {
  if (!/^[a-zA-Z0-9_]+_test$/.test(testName) || testName.toLowerCase() === mainName.toLowerCase()) {
    throw new Error('DB_NAME_TEST deve terminar em _test e ser diferente de DB_NAME.');
  }
}

if (nodeEnv === 'test') assertTestDatabase();

const env = {
  nodeEnv,
  host: process.env.HOST || '127.0.0.1',
  port: integer('PORT', 3001),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: integer('DB_PORT', 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: nodeEnv === 'test' ? testName : mainName,
    mainName,
    testName,
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  assertTestDatabase,
};

function validateRuntime() {
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV deve ser development, test ou production.');
  }
  if (env.jwt.secret.length < 32) {
    throw new Error('JWT_SECRET deve conter pelo menos 32 caracteres.');
  }
  try {
    require('jsonwebtoken').sign({}, env.jwt.secret, { algorithm: 'HS256', expiresIn: env.jwt.expiresIn });
  } catch {
    throw new Error('JWT_EXPIRES_IN deve ser uma duração válida, como 1h ou 30m.');
  }
  if (env.publicBaseUrl && !/^https?:\/\/[^\s]+$/.test(env.publicBaseUrl)) {
    throw new Error('PUBLIC_BASE_URL deve ser uma URL HTTP ou HTTPS.');
  }
}

env.validateRuntime = validateRuntime;
module.exports = env;
