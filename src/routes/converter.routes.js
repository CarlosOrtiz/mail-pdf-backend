const express = require('express');
const router = express.Router();
const fs = require('fs');
const { accessToken } = require('../../common/config/onedrive.config');
const { listFilesFromTodayFolder, convertAndUploadEml } = require('../services/converter.service');

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


router.post('/eml-to-pdf', async (req, res) => {
  try {
    const { driveId, fileId, targetFolder } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el fileId del archivo .eml'
      });
    }

    const result = await convertAndUploadEml(fileId, targetFolder || 'prueba');

    res.json(result);
  } catch (error) {
    console.error('Error en conversión:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

router.get('/cron', async (req, res) => {
  try {
    const result = await listFilesFromTodayFolder();
    res.json(result);
  } catch (error) {
    console.error('Error en conversión:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

/* router.post('/eml-to-pdf-by-name', async (req, res) => {
  try {
    const { fileName, targetFolder } = req.body;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el nombre del archivo'
      });
    }

    // Buscar el archivo
    const files = await findFileByName(fileName);

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No se encontró el archivo "${fileName}"`
      });
    }

    if (files.length > 1) {
      return res.json({
        success: false,
        error: 'Se encontraron múltiples archivos con ese nombre',
        files: files.map(f => ({
          id: f.id,
          name: f.name,
          path: f.parentReference?.path,
          webUrl: f.webUrl
        })),
        message: 'Por favor usa /api/convert/eml-to-pdf con el fileId específico'
      });
    }

    const fileId = files[0].id;
    const result = await convertAndUploadEml(fileId, targetFolder || 'prueba');

    res.json(result);
  } catch (error) {
    console.error('Error en conversión:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
}); */

/**
 * GET /api/convert/find-eml/:fileName
 * Busca un archivo EML en OneDrive
 */
/* router.get('/find-eml/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const files = await findFileByName(fileName);

    res.json({
      success: true,
      count: files.length,
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        path: f.parentReference?.path,
        webUrl: f.webUrl
      }))
    });
  } catch (error) {
    console.error('Error buscando archivo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}); */

module.exports = router;