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
let refreshToken = process.env.ONEDRIVE_REFRESH_TOKEN || null;

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

const refreshTokenManager = {
  get: () => refreshToken,
  set: (token) => {
    refreshToken = token;
    return refreshToken;
  },
  clear: () => {
    refreshToken = null;
  }
};

async function refreshAccessToken() {
  const currentRefreshToken = refreshTokenManager.get();

  if (!currentRefreshToken) {
    throw new Error('No hay refresh token disponible. Debes autenticarte primero en /auth/login');
  }

  try {
    console.log('🔄 Renovando access token...');

    const params = new URLSearchParams();
    params.append('client_id', oneDriveConfig.clientId);
    params.append('client_secret', oneDriveConfig.clientSecret);
    params.append('refresh_token', currentRefreshToken);
    params.append('grant_type', 'refresh_token');

    const response = await axios.post(oneDriveConfig.tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = response.data;

    if (data.access_token) {
      accessTokenManager.set(data.access_token);

      // Si viene un nuevo refresh token, actualizarlo también
      if (data.refresh_token) {
        refreshTokenManager.set(data.refresh_token);
      }

      console.log('✅ Access token renovado exitosamente');
      console.log(`⏰ Expira en: ${Math.floor(data.expires_in / 3600)} horas`);

      return data.access_token;
    } else {
      throw new Error('No se recibió access token en la respuesta');
    }
  } catch (error) {
    console.error('❌ Error renovando access token:', error.response?.data || error.message);
    throw new Error(`Error renovando access token: ${error.message}`);
  }
}

/**
 * Verifica si el token es válido, y si no, lo renueva automáticamente
 * @returns {Promise<string>} Access token válido
 */
async function ensureValidToken() {
  const token = accessTokenManager.get();

  if (!token) {
    console.log('⚠️  No hay access token, intentando renovar...');
    return await refreshAccessToken();
  }

  try {
    // Verificar si el token actual es válido
    await axios.get('https://graph.microsoft.com/v1.0/me/drive', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Access token válido');
    return token;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('⚠️  Access token expirado, renovando...');
      return await refreshAccessToken();
    }
    throw error;
  }
}

module.exports = {
  oneDriveConfig,
  accessToken: accessTokenManager,
  refreshToken: refreshTokenManager,
  refreshAccessToken,
  ensureValidToken
};
