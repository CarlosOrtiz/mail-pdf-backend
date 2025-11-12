require('dotenv').config();

const oneDriveConfig = {
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI || 'http://localhost:4001/auth/callback',
  tokenUrl: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
  authUrl: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize',
  scope: 'files.readwrite.all offline_access'
};

let accessToken = process.env.ONEDRIVE_ACCESS_TOKEN || null;

const accessTokenManager = {
  get: () => accessToken,
  set: (token) => {
    accessToken = token;
    return accessToken;
  },
  clear: () => {
    accessToken = null;
  }
};

module.exports = {
  oneDriveConfig,
  accessToken: accessTokenManager
};
