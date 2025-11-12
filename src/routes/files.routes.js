const express = require('express');
const router = express.Router();
const axios = require('axios');
const { accessToken } = require('../../common/config/onedrive.config');

const requireAuth = (req, res, next) => {
  if (!accessToken.get()) {
    return res.status(401).json({
      success: false,
      error: 'No hay access token. Visita /auth/login para autenticarte',
      redirectTo: '/auth/login'
    });
  }
  next();
};

router.use(requireAuth);

router.get('/verify-token', async (req, res) => {
  try {
    const response = await axios.get('https://graph.microsoft.com/v1.0/me/drive', {
      headers: {
        'Authorization': `Bearer ${accessToken.get()}`
      }
    });

    res.json({
      success: true,
      message: 'Token válido',
      drive: response.data
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token inválido o expirado',
      details: error.response?.data || error.message,
      action: 'Por favor renueva el token en /auth/refresh o vuelve a autenticarte en /auth/login'
    });
  }
});

router.get('/files', async (req, res) => {
  try {
    const response = await axios.get('https://graph.microsoft.com/v1.0/me/drive/root/children', {
      headers: {
        'Authorization': `Bearer ${accessToken.get()}`
      }
    });

    res.json({
      success: true,
      count: response.data.value.length,
      files: response.data.value.map(item => ({
        id: item.id,
        name: item.name,
        size: item.size,
        type: item.folder ? 'folder' : 'file',
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        webUrl: item.webUrl
      }))
    });
  } catch (error) {
    if (error.response?.status === 401) {
      res.status(401).json({
        success: false,
        error: 'Token expirado o inválido',
        details: error.response?.data || error.message,
        action: 'Renueva tu token en POST /auth/refresh con el refresh_token o vuelve a autenticarte en /auth/login'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data
      });
    }
  }
});

router.get('/files/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    
    const response = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`, {
      headers: {
        'Authorization': `Bearer ${accessToken.get()}`
      }
    });
    
    res.json({
      success: true,
      count: response.data.value.length,
      folder: folderId,
      files: response.data.value.map(item => ({
        id: item.id,
        name: item.name,
        size: item.size,
        type: item.folder ? 'folder' : 'file',
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        webUrl: item.webUrl
      }))
    });
  } catch (error) {
    if (error.response?.status === 401) {
      res.status(401).json({
        success: false,
        error: 'Token expirado o inválido',
        action: 'Renueva tu token en POST /auth/refresh'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data
      });
    }
  }
});

router.get('/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const response = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken.get()}`
      }
    });
    
    const item = response.data;
    
    res.json({
      success: true,
      file: {
        id: item.id,
        name: item.name,
        size: item.size,
        type: item.folder ? 'folder' : 'file',
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        webUrl: item.webUrl,
        downloadUrl: item['@microsoft.graph.downloadUrl']
      }
    });
  } catch (error) {
    if (error.response?.status === 401) {
      res.status(401).json({
        success: false,
        error: 'Token expirado o inválido',
        action: 'Renueva tu token en POST /auth/refresh'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data
      });
    }
  }
});

router.get('/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const response = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken.get()}`
      }
    });
    
    res.json({
      success: true,
      downloadUrl: response.data['@microsoft.graph.downloadUrl']
    });
  } catch (error) {
    if (error.response?.status === 401) {
      res.status(401).json({
        success: false,
        error: 'Token expirado o inválido',
        action: 'Renueva tu token en POST /auth/refresh'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data
      });
    }
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el parámetro de búsqueda "q"'
      });
    }

    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(q)}')`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken.get()}`
        }
      }
    );

    const data = response.data;
    
    res.json({
      success: true,
      count: data.value?.length || 0,
      query: q,
      results: data.value?.map(item => ({
        id: item.id,
        name: item.name,
        size: item.size,
        type: item.folder ? 'folder' : 'file',
        path: item.parentReference?.path,
        webUrl: item.webUrl
      })) || []
    });
  } catch (error) {
    if (error.response?.status === 401) {
      res.status(401).json({
        success: false,
        error: 'Token expirado o inválido',
        action: 'Renueva tu token en POST /auth/refresh'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data
      });
    }
  }
});

module.exports = router;