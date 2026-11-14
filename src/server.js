const app = require('./app');
const env = require('./config/env');
const { sequelize } = require('./models');

let server;
async function start() {
  await sequelize.authenticate();
  server = app.listen(env.port, env.host, () => {
    console.log(`API em http://${env.host}:${env.port}`);
    console.log(`Documentação em http://${env.host}:${env.port}/docs`);
  });
  server.on('error', async (error) => {
    console.error('Não foi possível iniciar a API:', error.code || error.name);
    await sequelize.close();
    process.exitCode = 1;
  });
}

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  const close = async () => {
    await sequelize.close();
    clearTimeout(timeout);
  };
  if (server) server.close(() => close().catch(() => { process.exitCode = 1; }));
  else close().catch(() => { process.exitCode = 1; });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
start().catch(async (error) => {
  console.error('Falha na conexão com o banco. Confira o MySQL e o arquivo .env:', error.name);
  await sequelize.close();
  process.exitCode = 1;
});
