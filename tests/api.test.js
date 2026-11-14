const fs = require('node:fs/promises');
const path = require('node:path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const SwaggerParser = require('@apidevtools/swagger-parser');
const app = require('../src/app');
const env = require('../src/config/env');
const { createMigrator } = require('../src/database/migrator');
const {
  sequelize, User, Category, Product, ProductImage, ProductOption, ProductCategory,
} = require('../src/models');

const PASSWORD = '123@123';
// PNG real de 1x1 pixel, mantido no teste para dispensar serviços externos.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==';
let passwordHash;
let initialized = false;
let sequence = 0;

function assertIsolatedDatabase() {
  env.assertTestDatabase();
  if (env.nodeEnv !== 'test' || sequelize.getDatabaseName() !== env.db.testName
    || path.basename(env.uploadDir).startsWith('digital-store-tests-') === false) {
    throw new Error('Recusada a limpeza: banco ou diretório de testes não está isolado.');
  }
}

async function clearFixtures() {
  assertIsolatedDatabase();
  for (const model of [ProductCategory, ProductImage, ProductOption, Product, Category, User]) {
    await model.destroy({ where: {} });
  }
  await fs.rm(env.uploadDir, { recursive: true, force: true });
  await fs.mkdir(env.uploadDir, { recursive: true });
}

beforeAll(async () => {
  assertIsolatedDatabase();
  await sequelize.authenticate();
  await createMigrator(sequelize).up();
  passwordHash = await bcrypt.hash(PASSWORD, 12);
  initialized = true;
});

beforeEach(async () => {
  if (initialized) await clearFixtures();
});

afterAll(async () => {
  if (initialized) await clearFixtures();
  await sequelize.close();
  await fs.rm(env.uploadDir, { recursive: true, force: true });
});

async function identity() {
  sequence += 1;
  const user = await User.create({
    firstname: 'Pessoa', surname: 'Teste', email: `pessoa-${sequence}@example.com`, password: passwordHash,
  });
  const token = jwt.sign({}, env.jwt.secret, {
    subject: String(user.id), algorithm: 'HS256', expiresIn: '1h',
  });
  return { user, token, authorization: `Bearer ${token}` };
}

async function category(authorization, attributes = {}) {
  sequence += 1;
  const response = await request(app).post('/v1/category').set('Authorization', authorization)
    .send({ name: 'Categoria', slug: `categoria-${sequence}`, ...attributes }).expect(201);
  return response.body;
}

async function product(authorization, attributes = {}) {
  sequence += 1;
  const payload = {
    name: 'Camiseta de algodão', slug: `produto-${sequence}`, price: 100,
    price_with_discount: 80, ...attributes,
  };
  const created = await request(app).post('/v1/product').set('Authorization', authorization)
    .send(payload).expect(201);
  if (created.body.id) {
    return (await request(app).get(`/v1/product/${created.body.id}`).expect(200)).body;
  }
  const all = await request(app).get('/v1/product/search').query({ limit: -1 }).expect(200);
  const found = all.body.data.find((item) => item.slug === payload.slug);
  expect(found).toBeDefined();
  return found;
}

async function uploadNames() {
  return (await fs.readdir(env.uploadDir)).filter((name) => name !== '.gitkeep').sort();
}

function uploadPath(content) {
  return path.join(env.uploadDir, path.basename(new URL(content, 'http://localhost').pathname));
}

function pngWithSize(size) {
  const source = Buffer.from(PNG, 'base64');
  const payload = Buffer.alloc(size - source.length - 12, 'a');
  Buffer.from('Comment\0').copy(payload);
  const type = Buffer.from('tEXt');
  const table = Array.from({ length: 256 }, (_, initial) => {
    let value = initial;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([type, payload])) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  // Metadado PNG válido antes de IEND permite controlar o tamanho exato da imagem.
  return Buffer.concat([source.subarray(0, -12), length, type, payload, checksum, source.subarray(-12)]);
}

describe('Migrations e documentação', () => {
  test('registra as seis migrations e mantém as chaves estrangeiras ativas', async () => {
    const [rows] = await sequelize.query('SELECT name FROM SequelizeMeta');
    expect(rows).toHaveLength(6);
    await expect(ProductCategory.create({ product_id: 2147483647, category_id: 2147483647 }))
      .rejects.toMatchObject({ name: 'SequelizeForeignKeyConstraintError' });
  });

  test('publica Swagger e um contrato OpenAPI válido para os quinze endpoints', async () => {
    await request(app).get('/docs/').expect(200).expect('Content-Type', /html/);
    const response = await request(app).get('/docs/openapi.json').expect(200);
    const parsed = await SwaggerParser.validate(response.body);
    const operations = Object.values(parsed.paths)
      .flatMap((item) => Object.keys(item).filter((key) => ['get', 'post', 'put', 'delete'].includes(key)));
    expect(operations).toHaveLength(15);
    expect(parsed.components.securitySchemes).toBeDefined();
  });
});

describe('Usuários e autenticação', () => {
  test('cadastra, consulta, autentica, atualiza e exclui o próprio usuário', async () => {
    const payload = {
      firstname: 'Ana', surname: 'Silva', email: 'ana@example.com',
      password: PASSWORD, confirmPassword: PASSWORD,
    };
    const created = await request(app).post('/v1/user').send(payload).expect(201);
    expect(created.body).toEqual({
      id: expect.any(Number), firstname: 'Ana', surname: 'Silva', email: payload.email,
    });
    const id = created.body.id;
    const persisted = await User.findByPk(id);
    expect(persisted.password).not.toBe(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, persisted.password)).toBe(true);
    await request(app).get(`/v1/user/${id}`).expect(200, created.body);
    const login = await request(app).post('/v1/user/token')
      .send({ email: payload.email, password: PASSWORD }).expect(200);
    const decoded = jwt.verify(login.body.token, env.jwt.secret, { algorithms: ['HS256'] });
    expect(decoded.sub).toBe(String(id));
    const authorization = `Bearer ${login.body.token}`;
    const updated = await request(app).put(`/v1/user/${id}`).set('Authorization', authorization)
      .send({ firstname: 'Ana Maria', email: 'ana.maria@example.com' }).expect(204);
    expect(updated.text).toBe('');
    const fetched = await request(app).get(`/v1/user/${id}`).expect(200);
    expect(fetched.body).toMatchObject({ firstname: 'Ana Maria', email: 'ana.maria@example.com' });
    expect(fetched.body).not.toHaveProperty('password');
    const removed = await request(app).delete(`/v1/user/${id}`).set('Authorization', authorization).expect(204);
    expect(removed.text).toBe('');
    await request(app).get(`/v1/user/${id}`).expect(404);
    await request(app).post('/v1/category').set('Authorization', authorization)
      .send({ name: 'Teste', slug: 'teste' }).expect(401);
  });

  test('recusa confirmação incorreta, e-mail inválido e cadastro duplicado', async () => {
    const { user } = await identity();
    const payload = {
      firstname: 'João', surname: 'Souza', email: user.email,
      password: PASSWORD, confirmPassword: PASSWORD,
    };
    await request(app).post('/v1/user').send({ ...payload, confirmPassword: 'outra-senha' }).expect(400);
    await request(app).post('/v1/user').send({ ...payload, email: 'invalido' }).expect(400);
    await request(app).post('/v1/user').send(payload).expect(400);
    expect(await User.count()).toBe(1);
    await request(app).post('/v1/user/token').send({ email: user.email, password: 'incorreta' }).expect(400);
    await request(app).post('/v1/user/token').send({ email: 'ausente@example.com', password: PASSWORD }).expect(400);
  });

  test('impede alteração e exclusão de outro usuário', async () => {
    const owner = await identity();
    const other = await identity();
    await request(app).put(`/v1/user/${other.user.id}`).set('Authorization', owner.authorization)
      .send({ firstname: 'Alterado' }).expect(403);
    await request(app).delete(`/v1/user/${other.user.id}`).set('Authorization', owner.authorization).expect(403);
    expect((await User.findByPk(other.user.id)).firstname).toBe('Pessoa');
    await request(app).put('/v1/user/2147483647').set('Authorization', owner.authorization)
      .send({ firstname: 'Ausente' }).expect(404);
    await request(app).delete('/v1/user/2147483647').set('Authorization', owner.authorization).expect(404);
  });

  test('rejeita tokens inválidos, expirados e assinados por outro algoritmo ou segredo', async () => {
    const { user } = await identity();
    const tokens = [
      'invalido',
      jwt.sign({}, env.jwt.secret, { subject: String(user.id), expiresIn: -1 }),
      jwt.sign({}, `${env.jwt.secret}-outro`, { subject: String(user.id) }),
      jwt.sign({}, env.jwt.secret, { subject: String(user.id), algorithm: 'HS384' }),
    ];
    for (const token of tokens) {
      const response = await request(app).post('/v1/category').set('Authorization', `Bearer ${token}`)
        .send({ name: 'Protegida', slug: 'protegida' }).expect(401);
      expect(response.body).toEqual({ message: expect.any(String) });
    }
  });

  test.each([
    ['put', '/v1/user/1'], ['delete', '/v1/user/1'],
    ['post', '/v1/category'], ['put', '/v1/category/1'], ['delete', '/v1/category/1'],
    ['post', '/v1/product'], ['put', '/v1/product/1'], ['delete', '/v1/product/1'],
  ])('exige JWT em %s %s', async (method, endpoint) => {
    const response = await request(app)[method](endpoint).send({}).expect(401);
    expect(response.body).toEqual({ message: expect.any(String) });
  });
});

describe('Categorias', () => {
  test('executa CRUD com respostas204 vazias e erros404', async () => {
    const { authorization } = await identity();
    const created = await category(authorization, { name: 'Calçados', slug: 'calcados', use_in_menu: true });
    expect(created).toMatchObject({ id: expect.any(Number), name: 'Calçados', use_in_menu: true });
    await request(app).get(`/v1/category/${created.id}`).expect(200, created);
    const update = await request(app).put(`/v1/category/${created.id}`).set('Authorization', authorization)
      .send({ name: 'Tênis', slug: 'tenis', use_in_menu: false }).expect(204);
    expect(update.text).toBe('');
    const fetched = await request(app).get(`/v1/category/${created.id}`).expect(200);
    expect(fetched.body).toMatchObject({ name: 'Tênis', slug: 'tenis', use_in_menu: false });
    const deletion = await request(app).delete(`/v1/category/${created.id}`).set('Authorization', authorization).expect(204);
    expect(deletion.text).toBe('');
    await request(app).get(`/v1/category/${created.id}`).expect(404);
    await request(app).put(`/v1/category/${created.id}`).set('Authorization', authorization)
      .send({ name: 'Ausente' }).expect(404);
    await request(app).delete(`/v1/category/${created.id}`).set('Authorization', authorization).expect(404);
  });

  test('aplica paginação, projeção, menu e limit=-1 ignorando page', async () => {
    const { authorization } = await identity();
    await category(authorization, { name: 'Primeira', use_in_menu: true });
    const second = await category(authorization, { name: 'Segunda', use_in_menu: false });
    await category(authorization, { name: 'Terceira', use_in_menu: true });
    const paged = await request(app).get('/v1/category/search').query({ limit: 1, page: 2 }).expect(200);
    expect(paged.body).toMatchObject({ total: 3, limit: 1, page: 2, data: [{ id: second.id }] });
    const menu = await request(app).get('/v1/category/search')
      .query({ use_in_menu: 'true', fields: 'name,slug', limit: -1, page: 'ignorado' }).expect(200);
    expect(menu.body).toMatchObject({ total: 2, limit: -1, page: 1 });
    expect(menu.body.data).toHaveLength(2);
    for (const item of menu.body.data) expect(Object.keys(item).sort()).toEqual(['name', 'slug']);
  });

  test('recusa slug duplicado e dados de categoria inválidos', async () => {
    const { authorization } = await identity();
    const current = await category(authorization, { slug: 'repetido' });
    await request(app).post('/v1/category').set('Authorization', authorization)
      .send({ name: 'Outra', slug: current.slug }).expect(400);
    await request(app).post('/v1/category').set('Authorization', authorization)
      .send({ name: '', slug: 'valido' }).expect(400);
    await request(app).post('/v1/category').set('Authorization', authorization)
      .send({ name: 'Categoria', slug: 'valido', use_in_menu: 'true' }).expect(400);
    for (const query of [{ limit: 0 }, { page: -1 }, { fields: 'password' }, { use_in_menu: 'talvez' }]) {
      await request(app).get('/v1/category/search').query(query).expect(400);
    }
  });
});

describe('Produtos, imagens e opções', () => {
  test('cadastra relações e imagem real, persiste CSV e devolve arrays sem campos internos', async () => {
    const { authorization } = await identity();
    const cat = await category(authorization);
    const created = await product(authorization, {
      enabled: true, stock: 10, category_ids: [cat.id],
      images: [{ type: 'image/png', content: PNG }],
      options: [{ title: 'Tamanho', radius: '4px', value: ['P', 'M', 'G'] }],
    });
    expect(created).toMatchObject({ enabled: true, stock: 10, category_ids: [cat.id] });
    expect(created.options[0]).toMatchObject({ title: 'Tamanho', radius: 4, values: ['P', 'M', 'G'] });
    expect(created.images[0]).toEqual({ id: expect.any(Number), content: expect.stringMatching(/^\/uploads\//) });
    expect(await fs.readFile(uploadPath(created.images[0].content))).toEqual(Buffer.from(PNG, 'base64'));
    await request(app).get(created.images[0].content).expect(200).expect('Content-Type', /image\/png/);
    expect((await ProductOption.findByPk(created.options[0].id)).values).toBe('P,M,G');
    const stored = await Product.findByPk(created.id);
    expect(stored.createdAt).toBeInstanceOf(Date);
    expect(stored.updatedAt).toBeInstanceOf(Date);
    expect(created.images[0]).not.toHaveProperty('path');
  });

  test('atualiza relações parcialmente, conserva omitidos e remove arquivos excluídos', async () => {
    const { authorization } = await identity();
    const cat = await category(authorization);
    const created = await product(authorization, {
      category_ids: [cat.id], images: [{ type: 'image/png', content: PNG }],
      options: [
        { title: 'Tamanho', values: ['P', 'M'] },
        { title: 'Material', values: ['Algodão'] },
      ],
    });
    const image = created.images[0];
    const size = created.options.find((item) => item.title === 'Tamanho');
    const material = created.options.find((item) => item.title === 'Material');
    const response = await request(app).put(`/v1/product/${created.id}`).set('Authorization', authorization).send({
      name: 'Camiseta atualizada', images: [{ id: image.id, content: image.content }],
      options: [{ id: size.id, radius: '10px', value: ['G', 'GG'] }],
    }).expect(204);
    expect(response.text).toBe('');
    const kept = (await request(app).get(`/v1/product/${created.id}`).expect(200)).body;
    expect(kept.category_ids).toEqual([cat.id]);
    expect(kept.images).toEqual(created.images);
    expect(kept.options).toHaveLength(2);
    expect(kept.options.find((item) => item.id === size.id)).toMatchObject({ radius: 10, values: ['G', 'GG'] });
    expect(kept.options.find((item) => item.id === material.id)).toMatchObject({ values: ['Algodão'] });
    await request(app).put(`/v1/product/${created.id}`).set('Authorization', authorization).send({
      category_ids: [], images: [{ id: image.id, deleted: true }],
      options: [{ id: material.id, deleted: true }, { title: 'Cor', type: 'color', values: ['#000'] }],
    }).expect(204);
    const changed = (await request(app).get(`/v1/product/${created.id}`).expect(200)).body;
    expect(changed.category_ids).toEqual([]);
    expect(changed.images).toEqual([]);
    expect(changed.options.map((item) => item.title).sort()).toEqual(['Cor', 'Tamanho']);
    expect(await uploadNames()).toEqual([]);
    expect(await ProductCategory.count()).toBe(0);
  });

  test('exclusão de produto remove vínculos, opções e arquivos, preservando categorias', async () => {
    const { authorization } = await identity();
    const cat = await category(authorization);
    const created = await product(authorization, {
      category_ids: [cat.id], images: [{ type: 'image/png', content: PNG }],
      options: [{ title: 'Tamanho', values: ['M'] }],
    });
    const deletion = await request(app).delete(`/v1/product/${created.id}`).set('Authorization', authorization).expect(204);
    expect(deletion.text).toBe('');
    await request(app).get(`/v1/product/${created.id}`).expect(404);
    await request(app).delete(`/v1/product/${created.id}`).set('Authorization', authorization).expect(404);
    expect(await ProductImage.count()).toBe(0);
    expect(await ProductOption.count()).toBe(0);
    expect(await ProductCategory.count()).toBe(0);
    expect(await Category.count()).toBe(1);
    expect(await uploadNames()).toEqual([]);
  });

  test('exclusão de categoria preserva o produto e remove somente o vínculo', async () => {
    const { authorization } = await identity();
    const cat = await category(authorization);
    const created = await product(authorization, { category_ids: [cat.id] });
    await request(app).delete(`/v1/category/${cat.id}`).set('Authorization', authorization).expect(204);
    const fetched = await request(app).get(`/v1/product/${created.id}`).expect(200);
    expect(fetched.body.category_ids).toEqual([]);
    expect(await Product.count()).toBe(1);
  });

  test('combina texto, categorias, faixa inclusiva, opções, paginação e projeção', async () => {
    const { authorization } = await identity();
    const clothing = await category(authorization, { name: 'Roupas' });
    const offers = await category(authorization, { name: 'Ofertas' });
    const first = await product(authorization, {
      name: 'Camiseta preta', description: 'Algodão macio', price: 100, price_with_discount: 90,
      category_ids: [clothing.id, offers.id], options: [{ title: 'Tamanho', values: ['P', 'M'] }],
    });
    const second = await product(authorization, {
      name: 'Camiseta branca', price: 200, price_with_discount: 150, category_ids: [clothing.id],
    });
    await product(authorization, { name: 'Boné', description: 'Modelo casual', price: 300, price_with_discount: 250 });
    const query = { match: 'Camiseta', category_ids: `${clothing.id},${offers.id}`, 'price-range': '100-200', limit: 1, page: 2 };
    const paged = await request(app).get('/v1/product/search').query(query).expect(200);
    expect(paged.body).toMatchObject({ total: 2, limit: 1, page: 2, data: [{ id: second.id }] });
    const filtered = await request(app).get('/v1/product/search').query({
      ...query, limit: -1, page: 'ignorado', fields: 'name,images,price',
      [`option[${first.options[0].id}]`]: 'PP,M',
    }).expect(200);
    expect(filtered.body).toMatchObject({ total: 1, limit: -1, page: 1 });
    expect(filtered.body.data[0]).toEqual({ name: 'Camiseta preta', images: [], price: 100 });
    const description = await request(app).get('/v1/product/search').query({ match: 'Algodão' }).expect(200);
    expect(description.body.data.map((item) => item.id)).toEqual([first.id]);
  });

  test('não aceita imagem ou opção pertencente a outro produto e preserva a operação inteira', async () => {
    const { authorization } = await identity();
    const owner = await product(authorization, {
      images: [{ type: 'image/png', content: PNG }], options: [{ title: 'Tamanho', values: ['M'] }],
    });
    const other = await product(authorization, { name: 'Outro produto' });
    const before = await uploadNames();
    for (const relation of [
      { images: [{ id: owner.images[0].id, deleted: true }] },
      { options: [{ id: owner.options[0].id, deleted: true }] },
    ]) {
      await request(app).put(`/v1/product/${other.id}`).set('Authorization', authorization)
        .send({ name: 'Não deve persistir', ...relation }).expect(400);
      const fetched = await request(app).get(`/v1/product/${other.id}`).expect(200);
      expect(fetched.body.name).toBe('Outro produto');
      expect(await uploadNames()).toEqual(before);
    }
    expect(await ProductImage.count()).toBe(1);
    expect(await ProductOption.count()).toBe(1);
  });

  test('erro de unicidade não deixa produto, relações ou arquivos novos', async () => {
    const { authorization } = await identity();
    const original = await product(authorization, { slug: 'produto-duplicado' });
    await request(app).post('/v1/product').set('Authorization', authorization).send({
      name: 'Duplicado', slug: original.slug, price: 100, price_with_discount: 50,
      images: [{ type: 'image/png', content: PNG }], options: [{ title: 'Cor', values: ['Preto'] }],
    }).expect(400);
    expect(await Product.count()).toBe(1);
    expect(await ProductImage.count()).toBe(0);
    expect(await ProductOption.count()).toBe(0);
    expect(await uploadNames()).toEqual([]);
  });

  test('rollback restaura relações e arquivos antigos após falha com arquivo novo já salvo', async () => {
    const { authorization } = await identity();
    const initialCategory = await category(authorization);
    const replacementCategory = await category(authorization);
    const optionOwner = await product(authorization, { options: [{ title: 'Tamanho', values: ['M'] }] });
    const target = await product(authorization, {
      name: 'Produto preservado', category_ids: [initialCategory.id],
      images: [{ type: 'image/png', content: PNG }],
    });
    const before = await uploadNames();
    await request(app).put(`/v1/product/${target.id}`).set('Authorization', authorization).send({
      name: 'Não deve persistir', category_ids: [replacementCategory.id],
      images: [
        { id: target.images[0].id, deleted: true },
        { type: 'image/png', content: PNG },
      ],
      options: [{ id: optionOwner.options[0].id, deleted: true }],
    }).expect(400);
    const restored = (await request(app).get(`/v1/product/${target.id}`).expect(200)).body;
    expect(restored.name).toBe('Produto preservado');
    expect(restored.category_ids).toEqual([initialCategory.id]);
    expect(restored.images).toEqual(target.images);
    expect(await uploadNames()).toEqual(before);
    expect(await fs.readFile(uploadPath(target.images[0].content))).toEqual(Buffer.from(PNG, 'base64'));
  });

  test('substituição de imagem publica novo arquivo e remove o anterior após confirmar o banco', async () => {
    const { authorization } = await identity();
    const target = await product(authorization, { images: [{ type: 'image/png', content: PNG }] });
    const oldImage = target.images[0];
    await request(app).put(`/v1/product/${target.id}`).set('Authorization', authorization)
      .send({ images: [{ id: oldImage.id, content: PNG }] }).expect(204);
    const replaced = (await request(app).get(`/v1/product/${target.id}`).expect(200)).body.images[0];
    expect(replaced.id).toBe(oldImage.id);
    expect(replaced.content).not.toBe(oldImage.content);
    await expect(fs.access(uploadPath(oldImage.content))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await fs.readFile(uploadPath(replaced.content))).toEqual(Buffer.from(PNG, 'base64'));
    expect(await uploadNames()).toHaveLength(1);
  });

  test('aplica o limite de5MB por imagem sem falhar ao processar base64 grande', async () => {
    const { authorization } = await identity();
    const atLimit = pngWithSize(5 * 1024 * 1024);
    await product(authorization, { images: [{ type: 'image/png', content: atLimit.toString('base64') }] });
    const tooLarge = pngWithSize(5 * 1024 * 1024 + 1);
    await request(app).post('/v1/product').set('Authorization', authorization).send({
      name: 'Imagem grande', slug: 'imagem-grande', price: 100, price_with_discount: 50,
      images: [{ type: 'image/png', content: tooLarge.toString('base64') }],
    }).expect(400);
    expect(await Product.count()).toBe(1);
    expect(await uploadNames()).toHaveLength(1);
  });

  test('valida tipos, arquivos, opções e referências antes de persistir dados', async () => {
    const { authorization } = await identity();
    const base = { name: 'Produto', slug: 'produto-invalido', price: 100, price_with_discount: 80 };
    const invalid = [
      { price: -1 }, { stock: 1.5 }, { enabled: 'true' }, { category_ids: [2147483647] },
      { images: [{ type: 'image/png', content: 'nao-e-base64' }] },
      { images: [{ type: 'image/svg+xml', content: Buffer.from('<svg/>').toString('base64') }] },
      { images: [{ type: 'image/jpeg', content: PNG }] },
      { options: [{ title: 'Opção', shape: 'triangle', values: ['M'] }] },
    ];
    for (const attributes of invalid) {
      const response = await request(app).post('/v1/product').set('Authorization', authorization)
        .send({ ...base, ...attributes }).expect(400);
      expect(response.body).toEqual({ message: expect.any(String) });
    }
    expect(await Product.count()).toBe(0);
    expect(await uploadNames()).toEqual([]);
  });

  test('recusa parâmetros de busca inválidos com400', async () => {
    for (const query of [
      { limit: 0 }, { page: -1 }, { fields: 'password' }, { category_ids: '1,invalido' },
      { 'price-range': '200-100' }, { 'option[abc]': 'M' },
    ]) {
      await request(app).get('/v1/product/search').query(query).expect(400);
    }
  });
});

describe('Erros HTTP', () => {
  test('JSON malformado retorna400 e rota desconhecida retorna404 com mensagem', async () => {
    const malformed = await request(app).post('/v1/user').set('Content-Type', 'application/json')
      .send('{"firstname":').expect(400);
    expect(malformed.body).toEqual({ message: expect.any(String) });
    const missing = await request(app).get('/rota-inexistente').expect(404);
    expect(missing.body).toEqual({ message: expect.any(String) });
  });

  test('corpo JSON acima de10MB retorna413 sem detalhes internos', async () => {
    const response = await request(app).post('/v1/user')
      .send({ firstname: 'a'.repeat(10 * 1024 * 1024), surname: 'Teste' }).expect(413);
    expect(response.body).toEqual({ message: expect.any(String) });
  });
});
