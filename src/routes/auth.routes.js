const express = require('express');
const router = express.Router();
const axios = require('axios');
const { oneDriveConfig, accessToken } = require('../../common/config/onedrive.config');

router.get('/login', (req, res) => {
  const authUrl = `${oneDriveConfig.authUrl}?` +
    `client_id=${oneDriveConfig.clientId}` +
    `&scope=${encodeURIComponent(oneDriveConfig.scope)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(oneDriveConfig.redirectUri)}`;

  res.redirect(authUrl);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'No se recibió código de autorización'
    });
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', oneDriveConfig.clientId);
    params.append('client_secret', oneDriveConfig.clientSecret);
    params.append('code', code);
    params.append('redirect_uri', oneDriveConfig.redirectUri);
    params.append('grant_type', 'authorization_code');

    const response = await axios.post(oneDriveConfig.tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const data = response.data;
    if (data.access_token) {
      accessToken.set(data.access_token);

      res.json(data)
    } else {
      res.status(500).json({
        success: false,
        error: 'Error al obtener access token',
        details: data
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.body.refresh_token || process.env.ONEDRIVE_REFRESH_TOKEN;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Se requiere refresh_token'
    });
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', oneDriveConfig.clientId);
    params.append('client_secret', oneDriveConfig.clientSecret);
    params.append('refresh_token', refreshToken);
    params.append('grant_type', 'refresh_token');

    const response = await axios.post(oneDriveConfig.tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = response.data;

    if (data.access_token) {
      accessToken.set(data.access_token);

      res.json({
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        message: 'Token renovado exitosamente'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error al renovar access token',
        details: data
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
