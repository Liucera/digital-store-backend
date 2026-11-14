const users = require('../services/users');
const { id } = require('../utils/accountValidation');

exports.find = async (req, res) => res.json(await users.find(id(req.params.id)));
exports.create = async (req, res) => {
  const user = await users.create(req.body);
  res.location(`/v1/user/${user.id}`).status(201).json(user);
};
exports.token = async (req, res) => res.json(await users.token(req.body));
exports.update = async (req, res) => {
  await users.update(id(req.params.id), req.user.id, req.body);
  res.status(204).end();
};
exports.remove = async (req, res) => {
  await users.remove(id(req.params.id), req.user.id);
  res.status(204).end();
};
