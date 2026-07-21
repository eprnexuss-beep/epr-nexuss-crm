const express = require('express');
const router = express.Router();
const leadController = require('../../controllers/erpControllers/leadController');

router.post('/', leadController.create);
router.get('/', leadController.list);
router.get('/:id', leadController.read);
router.put('/:id', leadController.update);
router.delete('/:id', leadController.delete);

module.exports = router;