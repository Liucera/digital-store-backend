const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const HttpError = require('../utils/HttpError');

module.exports = async function authenticate(req, res, next) {
  const authorization = req.get('Authorization');
  const match = typeof authorization === 'string' && /^Bearer ([^\s]+)$/i.exec(authorization);
  if (!match) throw new HttpError(401, 'Envie um token de autorização Bearer válido.');
  let payload;
  try {
    payload = jwt.verify(match[1], env.jwt.secret, { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Token inválido ou expirado.');
  }
  if (typeof payload !== 'object' || typeof payload.sub !== 'string' || !/^[1-9]\d*$/.test(payload.sub)) {
    throw new HttpError(401, 'Token inválido ou expirado.');
  }
  const id = Number(payload.sub);
  if (!Number.isSafeInteger(id) || id > 2147483647) throw new HttpError(401, 'Token inválido ou expirado.');
  // Consultar o usuário impede o uso de tokens de contas já excluídas.
  const user = await User.findByPk(id, { attributes: ['id'] });
  if (!user) throw new HttpError(401, 'O usuário deste token não existe.');
  req.user = { id: user.id };
  next();
};
