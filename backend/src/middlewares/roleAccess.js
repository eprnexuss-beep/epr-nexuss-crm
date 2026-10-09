const isAdmin = user => ['owner', 'admin'].includes(user?.role);
const requireAdmin = (req, res, next) => isAdmin(req.admin)
  ? next() : res.status(403).json({ success: false, message: 'Admin access required' });
// An employee loses access after Admin reassigns a lead to someone else.
const leadScope = user => isAdmin(user) ? {} : { assignedUser: user._id };
const leadFields = ['leadName', 'serviceType', 'otherServiceType', 'phone', 'email', 'source', 'status', 'followUps', 'updates'];
const pickLeadFields = body => Object.fromEntries(leadFields.filter(k => Object.hasOwn(body, k)).map(k => [k, body[k]]));
module.exports = { isAdmin, requireAdmin, leadScope, pickLeadFields };
