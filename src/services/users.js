const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const env = require('../config/env');
const HttpError = require('../utils/HttpError');
const validate = require('../utils/accountValidation');

const publicFields = ['id', 'firstname', 'surname', 'email'];
const allowedFields = ['firstname', 'surname', 'email', 'password', 'confirmPassword'];

function publicUser(user) {
  return Object.fromEntries(publicFields.map((field) => [field, user.get(field)]));
}

async function find(id) {
  const user = await User.findByPk(id, { attributes: publicFields });
  if (!user) throw new HttpError(404, 'Usuário não encontrado.');
  return publicUser(user);
}

async function create(body) {
  validate.objectBody(body, allowedFields);
  const attributes = {
    firstname: validate.text(body.firstname, 'firstname'),
    surname: validate.text(body.surname, 'surname'),
    email: validate.email(body.email),
    password: await bcrypt.hash(validate.password(body.password, body.confirmPassword), 12),
  };
  const user = await User.create(attributes);
  return publicUser(user);
}

async function token(body) {
  validate.objectBody(body, ['email', 'password']);
  const email = validate.email(body.email);
  if (typeof body.password !== 'string' || !body.password || Buffer.byteLength(body.password, 'utf8') > 72) {
    throw new HttpError(400, 'Informe e-mail e senha válidos.');
  }
  const user = await User.unscoped().findOne({ where: { email }, attributes: ['id', 'password'] });
  if (!user || !(await bcrypt.compare(body.password, user.password))) {
    throw new HttpError(400, 'E-mail ou senha incorretos.');
  }
  return {
    token: jwt.sign({}, env.jwt.secret, {
      algorithm: 'HS256', subject: String(user.id), expiresIn: env.jwt.expiresIn,
    }),
  };
}

async function update(id, ownerId, body) {
  const user = await User.findByPk(id, { attributes: publicFields });
  if (!user) throw new HttpError(404, 'Usuário não encontrado.');
  if (id !== ownerId) throw new HttpError(403, 'Você só pode alterar o próprio usuário.');
  validate.objectBody(body, allowedFields);
  if (!Object.keys(body).length) throw new HttpError(400, 'Informe ao menos um campo para atualizar.');
  const attributes = {};
  if (body.firstname !== undefined) attributes.firstname = validate.text(body.firstname, 'firstname');
  if (body.surname !== undefined) attributes.surname = validate.text(body.surname, 'surname');
  if (body.email !== undefined) attributes.email = validate.email(body.email);
  if (body.password !== undefined || body.confirmPassword !== undefined) {
    attributes.password = await bcrypt.hash(validate.password(body.password, body.confirmPassword), 12);
  }
  await user.update(attributes);
}

async function remove(id, ownerId) {
  const user = await User.findByPk(id, { attributes: ['id'] });
  if (!user) throw new HttpError(404, 'Usuário não encontrado.');
  if (id !== ownerId) throw new HttpError(403, 'Você só pode excluir o próprio usuário.');
  await user.destroy();
}

module.exports = { find, create, token, update, remove };
