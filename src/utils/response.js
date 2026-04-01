function success(res, statusCode, message, data = null) {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
}

function error(res, statusCode, message, errors = null) {
  const payload = { success: false, message };
  if (errors !== null) payload.errors = errors;
  return res.status(statusCode).json(payload);
}

module.exports = { success, error };
