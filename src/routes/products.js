const { Router } = require('express');
const products = require('../controllers/products');
const authenticate = require('../middleware/authenticate');

const router = Router();
router.get('/search', products.search);
router.get('/:id', products.findById);
router.post('/', authenticate, products.create);
router.put('/:id', authenticate, products.update);
router.delete('/:id', authenticate, products.remove);

module.exports = router;
