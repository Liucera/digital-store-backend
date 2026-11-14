const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable('product_options', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      product_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      title: { type: DataTypes.STRING(255), allowNull: false },
      shape: { type: DataTypes.ENUM('square', 'circle'), allowNull: false, defaultValue: 'square' },
      radius: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      type: { type: DataTypes.ENUM('text', 'color'), allowNull: false, defaultValue: 'text' },
      values: { type: DataTypes.STRING(255), allowNull: false },
    }, { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
  },
  async down({ context: queryInterface }) {
    await queryInterface.dropTable('product_options');
  },
};
