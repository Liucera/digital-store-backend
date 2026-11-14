const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const primaryKey = () => ({ type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false });
const requiredString = () => ({ type: DataTypes.STRING(255), allowNull: false });
const timestampOptions = { timestamps: true, underscored: true };

const User = sequelize.define('User', {
  id: primaryKey(),
  firstname: requiredString(),
  surname: requiredString(),
  email: { ...requiredString(), unique: true },
  password: requiredString(),
}, { ...timestampOptions, tableName: 'users' });

const Category = sequelize.define('Category', {
  id: primaryKey(),
  name: requiredString(),
  slug: { ...requiredString(), unique: true },
  use_in_menu: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { ...timestampOptions, tableName: 'categories' });

const Product = sequelize.define('Product', {
  id: primaryKey(),
  enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  name: requiredString(),
  slug: { ...requiredString(), unique: true },
  use_in_menu: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  description: { type: DataTypes.STRING(255), allowNull: true },
  price: { type: DataTypes.FLOAT, allowNull: false },
  price_with_discount: { type: DataTypes.FLOAT, allowNull: false },
}, { ...timestampOptions, tableName: 'products' });

const ProductImage = sequelize.define('ProductImage', {
  id: primaryKey(),
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  path: requiredString(),
}, { timestamps: false, tableName: 'product_images' });

const ProductOption = sequelize.define('ProductOption', {
  id: primaryKey(),
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  title: requiredString(),
  shape: { type: DataTypes.ENUM('square', 'circle'), allowNull: false, defaultValue: 'square' },
  radius: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  type: { type: DataTypes.ENUM('text', 'color'), allowNull: false, defaultValue: 'text' },
  values: requiredString(),
}, { timestamps: false, tableName: 'product_options' });

const ProductCategory = sequelize.define('ProductCategory', {
  product_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  category_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
}, { timestamps: false, tableName: 'product_categories' });

Product.hasMany(ProductImage, { as: 'images', foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });
Product.hasMany(ProductOption, { as: 'options', foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductOption.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });
Product.belongsToMany(Category, { as: 'categories', through: ProductCategory, foreignKey: 'product_id', otherKey: 'category_id', onDelete: 'CASCADE' });
Category.belongsToMany(Product, { as: 'products', through: ProductCategory, foreignKey: 'category_id', otherKey: 'product_id', onDelete: 'CASCADE' });

module.exports = { sequelize, User, Category, Product, ProductImage, ProductOption, ProductCategory };
