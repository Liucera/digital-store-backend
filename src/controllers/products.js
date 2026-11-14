const products = require('../services/products');

async function findById(req, res) { res.json(await products.findById(req.params.id)); }
async function search(req, res) { res.json(await products.search(req.query)); }
async function create(req, res) { res.status(201).json(await products.create(req.body)); }
async function update(req, res) {
  await products.update(req.params.id, req.body);
  res.status(204).end();
}
async function remove(req, res) {
  await products.remove(req.params.id);
  res.status(204).end();
}

module.exports = { findById, search, create, update, remove };
