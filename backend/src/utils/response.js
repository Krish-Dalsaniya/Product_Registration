const sendSuccess = (res, data, meta = null) => {
  const response = {
    success: true,
    data
  };
  if (meta) {
    response.meta = meta;
  }
  return res.json(response);
};

const sendError = (res, code, message, status = 500) => {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message
    }
  });
};

module.exports = {
  sendSuccess,
  sendError
};
