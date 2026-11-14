const HttpError = require('./HttpError');

const MAX_INT = 2147483647;
const SCALAR_FIELDS = ['id', 'enabled', 'name', 'slug', 'use_in_menu', 'stock', 'description', 'price', 'price_with_discount'];
const RELATION_FIELDS = ['category_ids', 'images', 'options'];
const INPUT_FIELDS = [...SCALAR_FIELDS.filter((field) => field !== 'id'), ...RELATION_FIELDS];
const own = (object, key) => Object.hasOwn(object, key);
const fail = (message) => { throw new HttpError(400, message); };

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} deve ser um objeto.`);
  return value;
}

function allowedKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`Campo não permitido em ${label}: ${key}.`);
  }
}

function integer(value, label, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum || value > MAX_INT) fail(`${label} deve ser um inteiro a partir de ${minimum}.`);
  return value;
}

function id(value, label = 'ID') {
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) value = Number(value);
  return integer(value, label, 1);
}

function text(value, label, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > 255) {
    fail(`${label} deve ser um texto ${allowEmpty ? '' : 'não vazio '}com até 255 caracteres.`);
  }
  return value.trim();
}

function boolean(value, label) {
  if (typeof value !== 'boolean') fail(`${label} deve ser booleano.`);
  return value;
}

function array(value, label) {
  if (!Array.isArray(value)) fail(`${label} deve ser uma lista.`);
  return value;
}

function productInput(body, update = false) {
  object(body, 'Produto');
  allowedKeys(body, INPUT_FIELDS, 'produto');
  if (update && Object.keys(body).length === 0) fail('Informe pelo menos um campo para atualizar.');
  const result = {};
  for (const field of ['name', 'slug', 'price', 'price_with_discount']) {
    if (!update && !own(body, field)) fail(`O campo ${field} é obrigatório.`);
  }
  for (const field of ['name', 'slug', 'description']) {
    if (own(body, field)) result[field] = text(body[field], field, field === 'description');
  }
  if (result.slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.slug)) {
    fail('slug deve conter letras minúsculas, números e hífens entre palavras.');
  }
  for (const field of ['enabled', 'use_in_menu']) {
    if (own(body, field)) result[field] = boolean(body[field], field);
  }
  if (own(body, 'stock')) result.stock = integer(body.stock, 'stock');
  for (const field of ['price', 'price_with_discount']) {
    if (own(body, field)) {
      if (typeof body[field] !== 'number' || !Number.isFinite(body[field]) || body[field] < 0 || body[field] > 1e12) {
        fail(`${field} deve ser um número não negativo de até 1 trilhão.`);
      }
      result[field] = body[field];
    }
  }
  if (own(body, 'category_ids')) {
    result.category_ids = [...new Set(array(body.category_ids, 'category_ids').map((value) => integer(value, 'category_ids', 1)))];
  }
  if (own(body, 'images')) {
    result.images = array(body.images, 'images').map((image) => imageInput(image, update));
    uniqueIds(result.images, 'images');
  }
  if (own(body, 'options')) {
    result.options = array(body.options, 'options').map((option) => optionInput(option, update));
    uniqueIds(result.options, 'options');
  }
  return result;
}

function uniqueIds(items, label) {
  const ids = items.filter((item) => item.id !== undefined).map((item) => item.id);
  if (new Set(ids).size !== ids.length) fail(`Há IDs repetidos em ${label}.`);
}

function imageInput(image, update) {
  object(image, 'Imagem');
  allowedKeys(image, ['id', 'deleted', 'type', 'content', 'enabled'], 'imagem');
  const result = { ...image };
  if (own(image, 'id')) {
    if (!update) fail('IDs de imagens só podem ser enviados na atualização.');
    result.id = integer(image.id, 'ID da imagem', 1);
  }
  if (own(image, 'deleted')) result.deleted = boolean(image.deleted, 'deleted');
  if (result.deleted) {
    if (!result.id) fail('Informe o ID da imagem a excluir.');
    allowedKeys(image, ['id', 'deleted'], 'exclusão de imagem');
    return result;
  }
  if (own(image, 'enabled')) result.enabled = boolean(image.enabled, 'enabled');
  if (!result.id && !own(image, 'content')) fail('O conteúdo da imagem é obrigatório.');
  if (own(image, 'content') && (typeof image.content !== 'string' || !image.content)) fail('content da imagem deve ser texto não vazio.');
  if (own(image, 'type') && !['image/png', 'image/jpeg', 'image/jpg'].includes(image.type)) fail('A imagem deve ser PNG ou JPEG.');
  if (!result.id && !own(image, 'type')) fail('O tipo da imagem é obrigatório.');
  if (result.id && !own(image, 'content') && own(image, 'type')) fail('Informe o conteúdo ao alterar o tipo da imagem.');
  return result;
}

function optionInput(option, update) {
  object(option, 'Opção');
  allowedKeys(option, ['id', 'deleted', 'title', 'shape', 'radius', 'type', 'values', 'value'], 'opção');
  const result = {};
  if (own(option, 'id')) {
    if (!update) fail('IDs de opções só podem ser enviados na atualização.');
    result.id = integer(option.id, 'ID da opção', 1);
  }
  if (own(option, 'deleted')) result.deleted = boolean(option.deleted, 'deleted');
  if (result.deleted) {
    if (!result.id) fail('Informe o ID da opção a excluir.');
    allowedKeys(option, ['id', 'deleted'], 'exclusão de opção');
    return result;
  }
  if (!result.id && !own(option, 'title')) fail('O título da opção é obrigatório.');
  if (own(option, 'title')) result.title = text(option.title, 'title');
  for (const [field, permitted] of [['shape', ['square', 'circle']], ['type', ['text', 'color']]]) {
    if (own(option, field)) {
      if (!permitted.includes(option[field])) fail(`${field} da opção inválido.`);
      result[field] = option[field];
    }
  }
  if (own(option, 'radius')) {
    const radius = typeof option.radius === 'string' && /^\d+px$/.test(option.radius) ? Number(option.radius.slice(0, -2)) : option.radius;
    result.radius = integer(radius, 'radius');
  }
  if (own(option, 'values') && own(option, 'value')) fail('Envie apenas values ou value na opção.');
  const values = own(option, 'values') ? option.values : option.value;
  if (!result.id && values === undefined) fail('Os valores da opção são obrigatórios.');
  if (values !== undefined) {
    const normalized = array(values, 'values').map((value) => text(value, 'Valor da opção'));
    if (normalized.length === 0 || normalized.some((value) => value.includes(','))) fail('values deve conter textos sem vírgula.');
    const joined = [...new Set(normalized)].join(',');
    if (joined.length > 255) fail('Os valores da opção devem somar até 255 caracteres.');
    result.values = joined;
  }
  return result;
}

function queryText(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} deve ser um texto não vazio.`);
  return value;
}

function productQuery(query) {
  const result = { limit: 12, page: 1, fields: [...SCALAR_FIELDS, ...RELATION_FIELDS], options: [] };
  for (const key of Object.keys(query)) {
    if (!['limit', 'page', 'fields', 'match', 'category_ids', 'price-range'].includes(key) && !/^option\[[1-9]\d*\]$/.test(key)) {
      fail(`Filtro não permitido: ${key}.`);
    }
  }
  if (own(query, 'limit')) {
    const value = queryText(query.limit, 'limit');
    if (value === '-1') result.limit = -1;
    else result.limit = id(value, 'limit');
  }
  if (result.limit !== -1 && own(query, 'page')) result.page = id(queryText(query.page, 'page'), 'page');
  if (result.limit !== -1 && !Number.isSafeInteger((result.page - 1) * result.limit)) fail('Paginação fora do intervalo permitido.');
  if (own(query, 'fields')) {
    result.fields = queryText(query.fields, 'fields').split(',').map((field) => field.trim());
    if (result.fields.some((field) => ![...SCALAR_FIELDS, ...RELATION_FIELDS].includes(field))) fail('fields contém um campo inválido.');
    result.fields = [...new Set(result.fields)];
  }
  if (own(query, 'match')) result.match = text(queryText(query.match, 'match'), 'match');
  if (own(query, 'category_ids')) {
    result.categoryIds = [...new Set(queryText(query.category_ids, 'category_ids').split(',').map((value) => id(value.trim(), 'category_ids')))];
  }
  if (own(query, 'price-range')) {
    const range = queryText(query['price-range'], 'price-range');
    if (!/^(?:\d+(?:\.\d+)?)-(?:\d+(?:\.\d+)?)$/.test(range)) fail('price-range deve usar o formato mínimo-máximo.');
    result.priceRange = range.split('-').map(Number);
    if (result.priceRange[0] > result.priceRange[1] || result.priceRange.some((value) => !Number.isFinite(value) || value > 1e12)) fail('Intervalo de preços inválido.');
  }
  for (const key of Object.keys(query).filter((name) => name.startsWith('option['))) {
    result.options.push({
      id: id(key.slice(7, -1), 'ID da opção'),
      values: queryText(query[key], key).split(',').map((value) => text(value, key))
    });
  }
  return result;
}

module.exports = { productInput, productQuery, id, SCALAR_FIELDS, RELATION_FIELDS };
