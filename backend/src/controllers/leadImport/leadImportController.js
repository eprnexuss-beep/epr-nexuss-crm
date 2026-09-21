const xlsx = require('xlsx');
const fs = require('fs');
const Lead = require('../../models/erpModels/Lead');

const VALID_EMPLOYEES = ['Bhanu', 'Anurag', 'Aina', 'Affan', 'Aman','Tabish Sir', 'Sakib'];
const VALID_SERVICE_TYPES = ['Lithium Recycling', 'Tyre Recycling', 'Biogas', 'Plastic Recycling', 'E-waste Recycling', 'RVSF', 'Other'];

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
      const rawAssignedTo = row['Assigned To'] || row['assignedTo'] || row['Employee'] || row['employee'];
      const matchedEmployee = VALID_EMPLOYEES.find(
        name => name.toLowerCase() === String(rawAssignedTo || '').trim().toLowerCase()
      );

      const VALID_STATUSES = ['new', 'contacted', 'qualified', 'won', 'not_interested'];
      const rawStatus = String(row['Status'] || row['status'] || '').trim().toLowerCase();
      const matchedStatus = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'new';

      const rawServiceType = row['Service Type'] || row['serviceType'] || row['Service'];
      const matchedServiceType = VALID_SERVICE_TYPES.find(
        type => type.toLowerCase() === String(rawServiceType || '').trim().toLowerCase()
      );

      const rawUpdate = row['Update'] || row['update'] || row['Notes'] || row['notes'];

      const leadData = {
        leadName: row['Name'] || row['name'] || row['Lead Name'] || row['leadName'],
        email: row['Email'] || row['email'],
        phone: row['Phone'] || row['phone'],
        assignedTo: matchedEmployee || '',
        serviceType: matchedServiceType || '',
        status: matchedStatus,
        source: row['Source'] || row['source'] || 'Sheet Import',
        updates: rawUpdate && String(rawUpdate).trim()
          ? [{ message: String(rawUpdate).trim() }]
          : [],
      };

      if (!leadData.leadName) {
        skipped.push({ row, reason: 'Missing leadName' });
        continue;
      }

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