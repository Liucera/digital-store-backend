const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable('product_images', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      product_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      path: { type: DataTypes.STRING(255), allowNull: false },
    }, { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
  },
  async down({ context: queryInterface }) {
    await queryInterface.dropTable('product_images');
  },
};
