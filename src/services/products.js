const { Op, literal } = require('sequelize');
const { sequelize, Product, Category, ProductImage, ProductOption, ProductCategory } = require('../models');
const HttpError = require('../utils/HttpError');
const { productInput, productQuery, id: parseId, SCALAR_FIELDS, RELATION_FIELDS } = require('../utils/productValidation');
const { decodeImage, saveImage, removeImage, imageUrl } = require('../utils/images');

const ALL_FIELDS = [...SCALAR_FIELDS, ...RELATION_FIELDS];

// Carregamento em lotes: o número de consultas não cresce com o número de produtos.
async function serializeProducts(products, fields = ALL_FIELDS, transaction) {
  if (!products.length) return [];
  const ids = products.map((product) => product.id);
  const where = { product_id: { [Op.in]: ids } };
  const [images, options, categories] = await Promise.all([
    fields.includes('images') ? ProductImage.findAll({ where, order: [['id', 'ASC']], transaction }) : [],
    fields.includes('options') ? ProductOption.findAll({ where, order: [['id', 'ASC']], transaction }) : [],
    fields.includes('category_ids') ? ProductCategory.findAll({ where, order: [['category_id', 'ASC']], transaction }) : []
  ]);
  const group = (rows) => {
    const result = new Map();
    for (const row of rows) {
      if (!result.has(row.product_id)) result.set(row.product_id, []);
      result.get(row.product_id).push(row);
    }
    return result;
  };
  const groupedImages = group(images);
  const groupedOptions = group(options);
  const groupedCategories = group(categories);
  return products.map((product) => {
    const result = {};
    for (const field of fields.filter((name) => SCALAR_FIELDS.includes(name))) result[field] = product[field];
    if (fields.includes('category_ids')) result.category_ids = (groupedCategories.get(product.id) || []).map((link) => link.category_id);
    if (fields.includes('images')) result.images = (groupedImages.get(product.id) || []).map((image) => ({ id: image.id, content: imageUrl(image.path) }));
    if (fields.includes('options')) {
      result.options = (groupedOptions.get(product.id) || []).map((option) => ({
        id: option.id, title: option.title, shape: option.shape, radius: option.radius,
        type: option.type, values: option.values.split(',')
      }));
    }
    return result;
  });
}

async function findById(value) {
  const product = await Product.findByPk(parseId(value));
  if (!product) throw new HttpError(404, 'Produto não encontrado.');
  return (await serializeProducts([product]))[0];
}

async function search(query) {
  const filters = productQuery(query);
  const where = {};
  if (filters.match) {
    const term = `%${filters.match.replace(/[\\%_]/g, '\\$&')}%`;
    where[Op.or] = [{ name: { [Op.like]: term } }, { description: { [Op.like]: term } }];
  }
  if (filters.priceRange) where.price = { [Op.between]: filters.priceRange };
  const expressions = [];
  // IDs são validados como inteiros; valores textuais são escapados pelo dialect.
  if (filters.categoryIds) {
    expressions.push(literal(`EXISTS (SELECT 1 FROM product_categories AS pc WHERE pc.product_id = \`Product\`.\`id\` AND pc.category_id IN (${filters.categoryIds.join(',')}))`));
  }
  for (const option of filters.options) {
    const alternatives = option.values.map((value) => `FIND_IN_SET(${sequelize.escape(value)}, po.\`values\`) > 0`).join(' OR ');
    expressions.push(literal(`EXISTS (SELECT 1 FROM product_options AS po WHERE po.product_id = \`Product\`.\`id\` AND po.id = ${option.id} AND (${alternatives}))`));
  }
  if (expressions.length) where[Op.and] = expressions;
  const attributes = [...new Set(['id', ...filters.fields.filter((field) => SCALAR_FIELDS.includes(field))])];
  const pagination = filters.limit === -1 ? {} : { limit: filters.limit, offset: (filters.page - 1) * filters.limit };
  const { count, rows } = await Product.findAndCountAll({ where, attributes, order: [['id', 'ASC']], ...pagination });
  return { data: await serializeProducts(rows, filters.fields), total: count, limit: filters.limit, page: filters.page };
}

async function validateCategories(categoryIds, transaction) {
  if (!categoryIds || !categoryIds.length) return;
  const count = await Category.count({ where: { id: { [Op.in]: categoryIds } }, transaction });
  if (count !== categoryIds.length) throw new HttpError(400, 'Uma ou mais categorias não existem.');
}

function validatePrices(values, previous = {}) {
  const price = values.price === undefined ? previous.price : values.price;
  const discounted = values.price_with_discount === undefined ? previous.price_with_discount : values.price_with_discount;
  if (discounted > price) throw new HttpError(400, 'O preço com desconto não pode superar o preço original.');
}

async function cleanup(paths) {
  const results = await Promise.allSettled([...new Set(paths)].map(removeImage));
  // A falha de limpeza não desfaz uma transação já confirmada no banco.
  for (const result of results) {
    if (result.status === 'rejected') console.error('Não foi possível remover um arquivo de imagem.', result.reason.message);
  }
}

async function setCategories(productId, categoryIds, transaction) {
  if (categoryIds === undefined) return;
  await ProductCategory.destroy({ where: { product_id: productId }, transaction });
  if (categoryIds.length) {
    await ProductCategory.bulkCreate(categoryIds.map((categoryId) => ({ product_id: productId, category_id: categoryId })), { transaction });
  }
}

async function setImages(productId, inputs, existing, transaction, newFiles, obsoleteFiles) {
  if (!inputs) return;
  const byId = new Map(existing.map((image) => [image.id, image]));
  for (const input of inputs) {
    const current = input.id ? byId.get(input.id) : null;
    if (input.id && !current) throw new HttpError(400, 'A imagem não pertence a este produto.');
    if (input.deleted) {
      await current.destroy({ transaction });
      obsoleteFiles.push(current.path);
      continue;
    }
    const unchangedContent = current && input.content !== undefined && input.content === imageUrl(current.path);
    if (unchangedContent && input.type && !input.type.endsWith(current.path.endsWith('.png') ? '/png' : '/jpeg') && !(input.type === 'image/jpg' && current.path.endsWith('.jpg'))) {
      throw new HttpError(400, 'O tipo informado não corresponde à imagem existente.');
    }
    let filename;
    if (input.content !== undefined && !unchangedContent) {
      const type = input.type || (current && current.path.endsWith('.png') ? 'image/png' : 'image/jpeg');
      filename = await saveImage(decodeImage(type, input.content));
      newFiles.push(filename);
    }
    const values = {};
    if (filename) values.path = filename;
    if (input.enabled !== undefined) values.enabled = input.enabled;
    if (current) {
      const previousPath = current.path;
      await current.update(values, { transaction });
      if (filename) obsoleteFiles.push(previousPath);
    } else {
      await ProductImage.create({ ...values, product_id: productId }, { transaction });
    }
  }
}

async function setOptions(productId, inputs, existing, transaction) {
  if (!inputs) return;
  const byId = new Map(existing.map((option) => [option.id, option]));
  for (const input of inputs) {
    const current = input.id ? byId.get(input.id) : null;
    if (input.id && !current) throw new HttpError(400, 'A opção não pertence a este produto.');
    if (input.deleted) await current.destroy({ transaction });
    else {
      const { id, deleted, ...values } = input;
      if (current) await current.update(values, { transaction });
      else await ProductOption.create({ ...values, product_id: productId }, { transaction });
    }
  }
}

function scalarValues(values) {
  return Object.fromEntries(Object.entries(values).filter(([key]) => SCALAR_FIELDS.includes(key) && key !== 'id'));
}

async function create(body) {
  const values = productInput(body);
  validatePrices(values);
  const newFiles = [];
  let productId;
  try {
    productId = await sequelize.transaction(async (transaction) => {
      await validateCategories(values.category_ids, transaction);
      const product = await Product.create(scalarValues(values), { transaction });
      await setCategories(product.id, values.category_ids, transaction);
      await setImages(product.id, values.images, [], transaction, newFiles, []);
      await setOptions(product.id, values.options, [], transaction);
      return product.id;
    });
  } catch (error) {
    await cleanup(newFiles);
    throw error;
  }
  return findById(productId);
}

async function update(value, body) {
  const productId = parseId(value);
  const values = productInput(body, true);
  const newFiles = [];
  const obsoleteFiles = [];
  try {
    await sequelize.transaction(async (transaction) => {
      const product = await Product.findByPk(productId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!product) throw new HttpError(404, 'Produto não encontrado.');
      validatePrices(values, product);
      await validateCategories(values.category_ids, transaction);
      const [images, options] = await Promise.all([
        values.images ? ProductImage.findAll({ where: { product_id: productId }, transaction }) : [],
        values.options ? ProductOption.findAll({ where: { product_id: productId }, transaction }) : []
      ]);
      await product.update(scalarValues(values), { transaction });
      await setCategories(productId, values.category_ids, transaction);
      await setImages(productId, values.images, images, transaction, newFiles, obsoleteFiles);
      await setOptions(productId, values.options, options, transaction);
    });
  } catch (error) {
    await cleanup(newFiles);
    throw error;
  }
  await cleanup(obsoleteFiles);
}

async function remove(value) {
  const productId = parseId(value);
  const obsoleteFiles = [];
  await sequelize.transaction(async (transaction) => {
    const product = await Product.findByPk(productId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!product) throw new HttpError(404, 'Produto não encontrado.');
    const images = await ProductImage.findAll({ where: { product_id: productId }, transaction });
    obsoleteFiles.push(...images.map((image) => image.path));
    await product.destroy({ transaction });
  });
  await cleanup(obsoleteFiles);
}

module.exports = { findById, search, create, update, remove };
