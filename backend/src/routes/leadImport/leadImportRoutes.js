const express = require('express');
const multer = require('multer');
const router = express.Router();
const { importLeads } = require('../../controllers/leadImport/leadImportController');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.route('/import').post(upload.single('file'), importLeads);

module.exports = router;