class HttpError extends Error {
  constructor(status, detail, message) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

module.exports = HttpError;