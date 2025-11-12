const express = require('express');
require('dotenv').config();

const authRouter = require('./src/routes/auth.routes');
const filesRouter = require('./src/routes/files.routes');
const indexRouter = require('./src/routes/index.routes');
const converterRouter = require('./src/routes/converter.routes');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(express.json());

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/api', filesRouter);
app.use('/api/convert', converterRouter);

app.get('/health', (req, res) => {
  const { accessToken } = require('./common/config/onedrive.config');
  res.json({
    status: 'OK',
    message: 'OneDrive API is running',
    hasAccessToken: !!accessToken.get()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;