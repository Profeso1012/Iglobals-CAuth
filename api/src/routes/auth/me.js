const { getUserById } = require('../../db/queries/users');

module.exports = async (req, res, next) => {
  try {
    const user = req.sessionUser;
    const { id, email, email_verified, phone, phone_verified, first_name, last_name,
      address_line1, address_line2, city, state, country, postal_code, created_at } = user;
    res.json({
      id, email, email_verified, phone, phone_verified, first_name, last_name,
      address_line1, address_line2, city, state, country, postal_code, created_at,
    });
  } catch (err) {
    next(err);
  }
};
