module.exports = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.status || 500;

  const response = {
    success: false,
    detail: err.detail || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Ocurrió un error inesperado en el servidor',
  };

  if (process.env.NODE_ENV === 'staging' && err.stack) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};