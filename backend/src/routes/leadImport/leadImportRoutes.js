const express = require('express');
const multer = require('multer');
const router = express.Router();
const { importLeads } = require('../../controllers/leadImport/leadImportController');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },
});

const { requireAdmin } = require('../../middlewares/roleAccess');
router.route('/import').post(requireAdmin, upload.single('file'), importLeads);

module.exports = router;