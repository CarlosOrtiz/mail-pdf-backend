const express = require("express");
const { getGraphClient } = require("../../common/utils/graph-client");
const { getAccessToken } = require('../../common/utils/access-token');

const router = express.Router();

app.get('/auth/login', (req, res) => {
  const authUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?` +
    `client_id=${clientId}` +
    `&scope=files.readwrite.all%20offline_access` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.redirect(authUrl);
});

// Endpoint de callback para recibir el código de autorización
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'No se recibió código de autorización'
    });
  }

  try {
    // Intercambiar código por access token (cuenta personal)
    const tokenUrl = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'authorization_code');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const data = await response.json();

    if (data.access_token) {
      accessToken = data.access_token;

      res.send(`
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
              .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; }
              .token { background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; word-break: break-all; }
              code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <div class="success">
              <h2>✅ Autenticación Exitosa</h2>
              <p>Tu access token ha sido generado. Cópialo y agrégalo a tu archivo <code>.env</code></p>
              
              <h3>Access Token:</h3>
              <div class="token">
                <code>${data.access_token}</code>
              </div>
              
              <h3>Refresh Token (guárdalo para renovar el access token):</h3>
              <div class="token">
                <code>${data.refresh_token || 'No disponible'}</code>
              </div>
              
              <p><strong>Expira en:</strong> ${data.expires_in} segundos (${Math.floor(data.expires_in / 3600)} horas)</p>
              
              <p>Agrega esto a tu archivo <code>.env</code>:</p>
              <div class="token">
                <code>ONEDRIVE_ACCESS_TOKEN=${data.access_token}</code><br>
                <code>ONEDRIVE_REFRESH_TOKEN=${data.refresh_token || ''}</code>
              </div>
              
              <p><a href="/api/files">Probar API - Ver archivos</a></p>
            </div>
          </body>
        </html>
      `);
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

// Endpoint para renovar access token usando refresh token
app.post('/auth/refresh', async (req, res) => {
  const refreshToken = req.body.refresh_token || process.env.ONEDRIVE_REFRESH_TOKEN;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Se requiere refresh_token'
    });
  }

  try {
    const tokenUrl = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('refresh_token', refreshToken);
    params.append('grant_type', 'refresh_token');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const data = await response.json();

    if (data.access_token) {
      accessToken = data.access_token;

      res.json({
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in
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
