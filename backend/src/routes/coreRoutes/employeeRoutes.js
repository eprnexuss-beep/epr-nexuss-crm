const router = require('express').Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { requireAdmin } = require('../../middlewares/roleAccess');
const Lead = require('../../models/erpModels/Lead');
const safe = fn => async (req, res) => { try { await fn(req, res); } catch (e) { res.status(400).json({ success: false, message: e.code === 11000 ? 'Email already exists' : e.message }); } };
const User = () => mongoose.model('Admin');
const Password = () => mongoose.model('AdminPassword');
const publicFields = 'name surname email enabled role created';
const label = user => [user.name, user.surname].filter(Boolean).join(' ');
const newPassword = async password => {
  const salt = crypto.randomBytes(24).toString('hex');
  return { salt, password: await bcrypt.hash(salt + password, 12), loggedSessions: [], resetToken: '', emailToken: '' };
};
router.use(requireAdmin);
router.get('/', safe(async (req, res) => {
  res.json({ success: true, data: await User().find({ role: 'employee', removed: false }).select(publicFields).sort({ name: 1 }) });
}));
router.post('/', safe(async (req, res) => {
  const { value, error } = Joi.object({ name: Joi.string().trim().min(1).max(100).required(), surname: Joi.string().trim().max(100).allow('').default(''), email: Joi.string().trim().lowercase().email().required(), password: Joi.string().min(8).max(128).required() }).validate(req.body);
  if (error) throw new Error(error.message);
  if (await User().exists({ email: value.email })) throw new Error('Email already exists');
  const { password, ...fields } = value;
  const user = await User().create({ ...fields, role: 'employee', enabled: false });
  try {
    await Password().create({ user: user._id, ...await newPassword(password), emailVerified: true });
    user.enabled = true; await user.save();
  } catch (e) { await Password().deleteOne({ user: user._id }); await User().deleteOne({ _id: user._id }); throw e; }
  res.status(201).json({ success: true, data: { _id: user._id, ...fields, enabled: true, role: 'employee' } });
}));
router.get('/legacy-assignments', safe(async (req, res) => {
  const rows = await Lead.aggregate([
    { $match: { assignedUser: null, assignedTo: { $type: 'string', $ne: '' } } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } }, { $sort: { _id: 1 } }
  ]);
  res.json({ success: true, data: rows.map(x => ({ name: x._id, count: x.count })) });
}));
router.post('/link-legacy', safe(async (req, res) => {
  const { employeeId, legacyName } = req.body;
  if (typeof employeeId !== 'string' || !mongoose.isValidObjectId(employeeId) || typeof legacyName !== 'string' || !legacyName) throw new Error('Select an employee and old assignment name');
  const user = await User().findOne({ _id: employeeId, role: 'employee', enabled: true, removed: false });
  if (!user) throw new Error('Choose an active employee');
  const result = await Lead.updateMany({ assignedUser: null, assignedTo: legacyName }, { $set: { assignedUser: user._id, assignedTo: label(user) } });
  res.json({ success: true, data: { linked: result.modifiedCount } });
}));
router.patch('/:id', safe(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new Error('Invalid employee');
  const { value, error } = Joi.object({ enabled: Joi.boolean(), password: Joi.string().min(8).max(128) }).min(1).validate(req.body);
  if (error) throw new Error(error.message);
  const user = await User().findOne({ _id: req.params.id, role: 'employee', removed: false });
  if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });
  if (value.password) await Password().updateOne({ user: user._id }, { $set: await newPassword(value.password) });
  if (Object.hasOwn(value, 'enabled')) {
    user.enabled = value.enabled; await user.save();
    if (!value.enabled) await Password().updateOne({ user: user._id }, { $set: { loggedSessions: [] } });
  }
  res.json({ success: true, message: 'Employee updated' });
}));
module.exports = router;
