const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

require('dotenv').config({ quiet: true });

const mainName = process.env.DB_NAME || 'digital_store_backend';
const testName = process.env.DB_NAME_TEST || 'digital_store_backend_test';
if (!/^[a-zA-Z0-9_]+_test$/.test(testName) || testName.toLowerCase() === mainName.toLowerCase()) {
  throw new Error('Os testes exigem DB_NAME_TEST terminado em _test e diferente de DB_NAME.');
}

process.env.NODE_ENV = 'test';
process.env.DB_NAME_TEST = testName;
process.env.JWT_SECRET ||= 'digital-store-integration-tests-secret-2026';
// Cada execução recebe seu próprio diretório; uploads de uso normal não são tocados.
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'digital-store-tests-'));
process.env.PUBLIC_BASE_URL = '';
