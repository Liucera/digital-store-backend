const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable('product_categories', {
      product_id: {
        type: DataTypes.INTEGER, allowNull: false, primaryKey: true,
        references: { model: 'products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      category_id: {
        type: DataTypes.INTEGER, allowNull: false, primaryKey: true,
        references: { model: 'categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
    }, { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });
    // A PK atende buscas por produto; este índice atende buscas por categoria.
    await queryInterface.addIndex('product_categories', ['category_id', 'product_id'], { name: 'product_categories_category_idx' });
  },
  async down({ context: queryInterface }) {
    await queryInterface.dropTable('product_categories');
  },
};
