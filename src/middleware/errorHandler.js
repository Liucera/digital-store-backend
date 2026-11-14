const { ValidationError, ForeignKeyConstraintError, UniqueConstraintError } = require('sequelize');

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'O corpo da requisição excede o limite de 10 MB.' });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'O corpo deve conter JSON válido.' });
  }
  if (error instanceof UniqueConstraintError) {
    return res.status(400).json({ message: 'Já existe um registro com os dados informados.' });
  }
  if (error instanceof ForeignKeyConstraintError) {
    return res.status(400).json({ message: 'O registro referenciado não existe ou está em uso.' });
  }
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: 'Os dados informados são inválidos.' });
  }
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ message: error.message });
  }

  // Não expõe consultas SQL, credenciais ou detalhes internos na resposta.
  if (process.env.NODE_ENV !== 'test') console.error('Falha interna na API:', error.name);
  return res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
}

module.exports = errorHandler;
