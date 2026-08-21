const axios = require('axios');
const Lead = require('../../models/erpModels/Lead');

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
const EMPLOYEES_ROTATION = ['Aman', 'Aina', 'Bhanu', 'Anurag', 'Affan']; // Add more employees as needed

// Simple in-memory rotation (resets on server restart — fine for low volume, upgrade later if needed)
let lastAssignedIndex = -1;
function getNextEmployee() {
  lastAssignedIndex = (lastAssignedIndex + 1) % EMPLOYEES_ROTATION.length;
  return EMPLOYEES_ROTATION[lastAssignedIndex];
}

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

exports.receiveWebhook = async (req, res) => {
  res.sendStatus(200); // respond fast

  try {
    const entries = req.body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field === 'leadgen') {
          const leadgenId = change.value.leadgen_id;

          const response = await axios.get(
            `https://graph.facebook.com/v26.0/${leadgenId}`,
            { params: { access_token: PAGE_ACCESS_TOKEN } }
          );

          const fieldData = response.data.field_data || [];
          const leadFields = {};
          fieldData.forEach(f => {
            leadFields[f.name] = f.values[0];
          });

          const assignedTo = getNextEmployee();

          await Lead.create({
            leadName: leadFields.full_name || leadFields.name || 'Meta Lead',
            email: leadFields.email || '',
            phone: leadFields.phone_number || '',
            assignedTo,
            source: 'Meta Lead Ads',
            status: 'new',
          });

          console.log('Lead created from Meta webhook:', leadFields);
        }
      }
    }
  } catch (err) {
    console.error('Error processing Meta webhook:', err.response?.data || err.message);
  }
};