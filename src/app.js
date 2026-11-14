const express = require('express');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const openapi = require('./docs/openapi.json');

env.validateRuntime();

const app = express();
app.disable('x-powered-by');
app.set('query parser', 'simple');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.json({ limit: '10mb' }));
app.get('/docs/openapi.json', (req, res) => res.json(openapi));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
  customSiteTitle: 'Digital Store — Documentação da API',
  swaggerOptions: { persistAuthorization: false },
}));
app.use('/uploads', express.static(env.uploadDir, { dotfiles: 'deny', index: false }));
app.use('/v1/user', require('./routes/users'));
app.use('/v1/category', require('./routes/categories'));
app.use('/v1/product', require('./routes/products'));
app.use((req, res) => res.status(404).json({ message: 'Endpoint não encontrado.' }));
app.use(errorHandler);

module.exports = app;
