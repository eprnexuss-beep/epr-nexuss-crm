const xlsx = require('xlsx');
const fs = require('fs');
const Lead = require('../../models/erpModels/Lead');

exports.importLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let imported = 0;
    let skipped = [];

    for (const row of rows) {
      const leadData = {
        leadName: row['Name'] || row['name'] || row['Lead Name'] || row['leadName'],
        email: row['Email'] || row['email'],
        phone: row['Phone'] || row['phone'],
        company: row['Company'] || row['company'],
        source: row['Source'] || row['source'] || 'Sheet Import',
      };

      // leadName is the only truly required field in the schema
      if (!leadData.leadName) {
        skipped.push({ row, reason: 'Missing leadName' });
        continue;
      }

      // Only check duplicates if the row actually has an email
      if (leadData.email) {
        const exists = await Lead.findOne({ email: leadData.email });
        if (exists) {
          skipped.push({ row, reason: 'Duplicate email' });
          continue;
        }
      }

      await Lead.create(leadData);
      imported++;
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      result: { imported, skippedCount: skipped.length, skipped },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};