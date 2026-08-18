const express = require('express');
const router = express.Router();
const { verifyWebhook, receiveWebhook } = require('../../controllers/metaWebhook/metaWebhookController');

router.get('/webhooks/meta-leads', verifyWebhook);
router.post('/webhooks/meta-leads', receiveWebhook);

module.exports = router;