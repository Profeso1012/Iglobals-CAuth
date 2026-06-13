const { updateUser } = require('../../db/queries/users');
const { logEvent } = require('../../db/queries/audit_log');

const ALLOWED_FIELDS = ['first_name', 'last_name', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'country', 'postal_code'];

module.exports = async (req, res, next) => {
  try {
    const user = req.sessionUser;
    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    
    // If phone number is updated, we must reset its verification status
    if (updates.phone !== undefined && updates.phone !== user.phone) {
      updates.phone_verified = false;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(422).json({ error: 'validation_error', error_description: 'No updatable fields provided.', status: 422 });
    }

    const updated = await updateUser(user.id, updates);
    await logEvent({ event_type: 'user.profile.updated', user_id: user.id, ip_address: req.ip });

    const { id, email, email_verified, phone, phone_verified, first_name, last_name,
      address_line1, address_line2, city, state, country, postal_code, created_at } = updated;
    res.json({ id, email, email_verified, phone, phone_verified, first_name, last_name,
      address_line1, address_line2, city, state, country, postal_code, created_at });
  } catch (err) {
    next(err);
  }
};
