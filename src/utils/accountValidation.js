const HttpError = require('./HttpError');

function objectBody(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Envie um objeto JSON válido.');
  }
  const unknown = Object.keys(body).find((key) => !allowed.includes(key));
  if (unknown) throw new HttpError(400, `Campo não permitido: ${unknown}.`);
}

function text(value, field, maxLength = 255) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new HttpError(400, `${field} deve ser um texto entre 1 e ${maxLength} caracteres.`);
  }
  return value.trim();
}

function email(value) {
  const normalized = text(value, 'email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new HttpError(400, 'Informe um e-mail válido.');
  }
  return normalized;
}

function password(value, confirmPassword) {
  // bcrypt considera no máximo 72 bytes; rejeitar excedentes evita senhas equivalentes.
  if (typeof value !== 'string' || value.length < 6 || Buffer.byteLength(value, 'utf8') > 72) {
    throw new HttpError(400, 'A senha deve ter pelo menos 6 caracteres e no máximo 72 bytes.');
  }
  if (value !== confirmPassword) throw new HttpError(400, 'A confirmação da senha não confere.');
  return value;
}

function id(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, 'O ID deve ser um inteiro positivo.');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > 2147483647) {
    throw new HttpError(400, 'O ID informado está fora do intervalo permitido.');
  }
  return parsed;
}

function positiveQueryInteger(value, field) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, `${field} deve ser um inteiro positivo.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > 2147483647) {
    throw new HttpError(400, `${field} está fora do intervalo permitido.`);
  }
  return parsed;
}

function pagination(query) {
  const limit = query.limit === undefined ? 12 : query.limit === '-1'
    ? -1 : positiveQueryInteger(query.limit, 'limit');
  // A especificação determina que page seja ignorado quando limit=-1.
  const page = limit === -1 || query.page === undefined ? 1 : positiveQueryInteger(query.page, 'page');
  const offset = limit === -1 ? 0 : (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) throw new HttpError(400, 'A paginação informada está fora do intervalo permitido.');
  return { limit, page, offset };
}

module.exports = { objectBody, text, email, password, id, pagination };
