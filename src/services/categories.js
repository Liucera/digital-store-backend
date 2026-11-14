const { Category } = require('../models');
const HttpError = require('../utils/HttpError');
const validate = require('../utils/accountValidation');

const fields = ['id', 'name', 'slug', 'use_in_menu'];

function attributes(body, partial = false) {
  validate.objectBody(body, ['name', 'slug', 'use_in_menu']);
  if (partial && !Object.keys(body).length) throw new HttpError(400, 'Informe ao menos um campo para atualizar.');
  const data = {};
  if (!partial || body.name !== undefined) data.name = validate.text(body.name, 'name');
  if (!partial || body.slug !== undefined) {
    data.slug = validate.text(body.slug, 'slug');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
      throw new HttpError(400, 'slug deve conter letras minúsculas, números e hífens entre palavras.');
    }
  }
  if (body.use_in_menu !== undefined) {
    if (typeof body.use_in_menu !== 'boolean') throw new HttpError(400, 'use_in_menu deve ser booleano.');
    data.use_in_menu = body.use_in_menu;
  }
  return data;
}

function serialize(category, selected = fields) {
  return Object.fromEntries(selected.map((field) => [field, category.get(field)]));
}

async function findModel(id) {
  const category = await Category.findByPk(id, { attributes: fields });
  if (!category) throw new HttpError(404, 'Categoria não encontrada.');
  return category;
}

async function search(query) {
  const unknown = Object.keys(query).find((key) => !['limit', 'page', 'fields', 'use_in_menu'].includes(key));
  if (unknown) throw new HttpError(400, `Parâmetro não permitido: ${unknown}.`);
  const { limit, page, offset } = validate.pagination(query);
  let selected = fields;
  if (query.fields !== undefined) {
    if (typeof query.fields !== 'string' || !query.fields) throw new HttpError(400, 'fields deve ser uma lista de campos separados por vírgula.');
    selected = [...new Set(query.fields.split(',').map((field) => field.trim()))];
    if (selected.some((field) => !fields.includes(field))) throw new HttpError(400, 'fields contém um campo desconhecido.');
  }
  const where = {};
  if (query.use_in_menu !== undefined) {
    if (!['true', 'false'].includes(query.use_in_menu)) throw new HttpError(400, 'use_in_menu deve ser true ou false.');
    where.use_in_menu = query.use_in_menu === 'true';
  }
  const options = { where, attributes: selected, order: [['id', 'ASC']] };
  if (limit !== -1) Object.assign(options, { limit, offset });
  const { count, rows } = await Category.findAndCountAll(options);
  return { data: rows.map((category) => serialize(category, selected)), total: count, limit, page };
}

async function find(id) { return serialize(await findModel(id)); }
async function create(body) { return serialize(await Category.create(attributes(body))); }
async function update(id, body) { await (await findModel(id)).update(attributes(body, true)); }
async function remove(id) { await (await findModel(id)).destroy(); }

module.exports = { search, find, create, update, remove };
