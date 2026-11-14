const router = require('express').Router();
const users = require('../controllers/users');
const authenticate = require('../middleware/authenticate');

router.post('/token', users.token);
router.post('/', users.create);
router.get('/:id', users.find);
router.put('/:id', authenticate, users.update);
router.delete('/:id', authenticate, users.remove);

module.exports = router;
