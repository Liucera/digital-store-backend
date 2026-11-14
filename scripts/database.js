// Carregue NODE_ENV antes do módulo de configuração escolher o banco.
if (process.argv.includes('--test')) process.env.NODE_ENV = 'test';

const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const sequelize = require('../src/config/database');
const { createMigrator } = require('../src/database/migrator');

async function main() {
  const action = process.argv[2];
  if (!['create', 'migrate', 'undo'].includes(action)) {
    throw new Error('Uso: node scripts/database.js create|migrate|undo [--test]');
  }
  if (env.nodeEnv === 'test') env.assertTestDatabase();
  if (!/^[a-zA-Z0-9_]+$/.test(env.db.name)) {
    throw new Error('O nome do banco deve conter somente letras, números e sublinhados.');
  }
  if (action === 'create') {
    const connection = await mysql.createConnection({
      host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password,
    });
    try {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`Banco ${env.db.name} disponível.`);
    } finally {
      await connection.end();
    }
    return;
  }
  await sequelize.authenticate();
  const migrator = createMigrator(sequelize);
  const migrations = action === 'migrate' ? await migrator.up() : await migrator.down();
  console.log(`${migrations.length} migration(s) ${action === 'migrate' ? 'aplicada(s)' : 'revertida(s)'} em ${env.db.name}.`);
}

main().catch((error) => {
  console.error(`Falha no banco: ${error.message}`);
  process.exitCode = 1;
}).finally(() => sequelize.close());
