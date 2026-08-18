const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

// Meta calls this with GET to verify your webhook URL
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// Meta calls this with POST whenever a new lead comes in
exports.receiveWebhook = (req, res) => {
  console.log('Webhook event received:', JSON.stringify(req.body, null, 2));

  // Respond quickly so Meta doesn't retry
  res.sendStatus(200);

  // TODO: process the lead data here (next step)
};