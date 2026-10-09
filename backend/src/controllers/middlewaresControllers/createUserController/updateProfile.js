const mongoose = require('mongoose');

const updateProfile = async (userModel, req, res) => {
  const User = mongoose.model(userModel);

  const reqUserName = userModel.toLowerCase();
  const userProfile = req[reqUserName];

  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (userProfile.email === 'admin@demo.com') {
    return res.status(403).json({
      success: false,
      result: null,
      message: "you couldn't update demo informations",
    });
  }

  let updates = req.body.photo
    ? {
        email: req.body.email,
        name: req.body.name,
        surname: req.body.surname,
        photo: req.body.photo,
      }
    : {
        email: req.body.email,
        name: req.body.name,
        surname: req.body.surname,
      };
  if (updates.email) {
    updates.email = String(updates.email).trim().toLowerCase();
    const duplicate = await User.exists({ email: updates.email, _id: { $ne: userProfile._id } });
    if (duplicate) return res.status(409).json({ success: false, message: 'Email already belongs to another account' });
  }
  // Find document by id and updates with the required fields
  const result = await User.findOneAndUpdate(
    { _id: userProfile._id, removed: false },
    { $set: updates },
    {
      new: true, // return the new result instead of the old one
    }
  ).exec();

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No profile found by this id: ' + userProfile._id,
    });
  }
  return res.status(200).json({
    success: true,
    result: {
      _id: result?._id,
      enabled: result?.enabled,
      email: result?.email,
      name: result?.name,
      surname: result?.surname,
      photo: result?.photo,
      role: result?.role,
      token
    },
    message: 'we update this profile by this id: ' + userProfile._id,
  });
};

module.exports = updateProfile;
