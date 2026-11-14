const { Sequelize } = require('sequelize');
const env = require('./env');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  logging: false,
  timezone: '+00:00',
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  define: { underscored: true, freezeTableName: true },
});

module.exports = sequelize;
