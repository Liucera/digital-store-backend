const path = require('node:path');
const { Umzug, SequelizeStorage } = require('umzug');

function createMigrator(sequelize) {
  return new Umzug({
    migrations: { glob: path.join(__dirname, 'migrations/*.js').replace(/\\/g, '/') },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta' }),
    logger: undefined,
  });
}

module.exports = { createMigrator };
