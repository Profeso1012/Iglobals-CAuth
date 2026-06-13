function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const fields = {};
      error.details.forEach(detail => {
        fields[detail.path.join('.')] = detail.message;
      });
      return res.status(422).json({
        error: 'validation_error',
        error_description: 'One or more fields are invalid.',
        fields,
        status: 422,
      });
    }
    req.body = value;
    next();
  };
}

module.exports = validateBody;
