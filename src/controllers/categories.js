const categories = require('../services/categories');
const { id } = require('../utils/accountValidation');

exports.search = async (req, res) => res.json(await categories.search(req.query));
exports.find = async (req, res) => res.json(await categories.find(id(req.params.id)));
exports.create = async (req, res) => {
  const category = await categories.create(req.body);
  res.location(`/v1/category/${category.id}`).status(201).json(category);
};
exports.update = async (req, res) => {
  await categories.update(id(req.params.id), req.body);
  res.status(204).end();
};
exports.remove = async (req, res) => {
  await categories.remove(id(req.params.id));
  res.status(204).end();
};
