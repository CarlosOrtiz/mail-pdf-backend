const express = require('express');
const router = express.Router();
const { accessToken } = require('../../common/config/onedrive.config');

router.get('/', (req, res) => {
  const hasToken = !!accessToken.get();
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OneDrive API</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
          }
          .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
          }
          .header p {
            font-size: 1.1em;
            opacity: 0.9;
          }
          .content {
            padding: 40px;
          }
          .status {
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 1.1em;
          }
          .status.connected {
            background: #d4edda;
            border: 2px solid #28a745;
            color: #155724;
          }
          .status.disconnected {
            background: #f8d7da;
            border: 2px solid #dc3545;
            color: #721c24;
          }
          .status-icon {
            font-size: 2em;
          }
          .card {
            background: #f8f9fa;
            padding: 25px;
            margin: 20px 0;
            border-radius: 10px;
            border-left: 4px solid #667eea;
          }
          .card h2 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.5em;
          }
          .card ul {
            list-style: none;
            padding-left: 0;
          }
          .card li {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .card li:last-child {
            border-bottom: none;
          }
          code {
            background: #e9ecef;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            color: #d63384;
          }
          .btn {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
            margin: 10px 10px 10px 0;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
          }
          .btn-secondary {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          .endpoint {
            background: white;
            padding: 12px;
            margin: 8px 0;
            border-radius: 5px;
            border-left: 3px solid #667eea;
          }
          .method {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: bold;
            margin-right: 10px;
          }
          .method.get { background: #61affe; color: white; }
          .method.post { background: #49cc90; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌥️ OneDrive API</h1>
            <p>Accede a tus archivos de OneDrive mediante API REST</p>
          </div>
          
          <div class="content">
            <div class="status ${hasToken ? 'connected' : 'disconnected'}">
              <div class="status-icon">${hasToken ? '✅' : '❌'}</div>
              <div>
                <strong>Estado de conexión:</strong> ${hasToken ? 'Conectado y listo para usar' : 'No autenticado'}
                ${!hasToken ? '<br><small>Necesitas autenticarte para usar la API</small>' : ''}
              </div>
            </div>
            
            ${!hasToken ? `
              <div class="card">
                <h2>🔐 Primeros Pasos</h2>
                <p style="margin-bottom: 20px;">Para comenzar a usar la API, necesitas autenticarte con tu cuenta de Microsoft:</p>
                <a href="/auth/login" class="btn">Iniciar sesión con OneDrive</a>
              </div>
            ` : `
              <div class="card">
                <h2>🎉 ¡Listo para usar!</h2>
                <p style="margin-bottom: 20px;">Tu API está autenticada y lista. Prueba estos endpoints:</p>
                <a href="/api/files" class="btn">Ver mis archivos</a>
                <a href="/api/search?q=documento" class="btn btn-secondary">Buscar archivos</a>
              </div>
            `}
            
            <div class="card">
              <h2>📡 Endpoints Disponibles</h2>
              
              <h3 style="margin-top: 20px; color: #666;">Autenticación</h3>
              <div class="endpoint">
                <span class="method get">GET</span>
                <code>/auth/login</code>
                <p style="margin-top: 8px; color: #666;">Iniciar sesión con Microsoft</p>
              </div>
              <div class="endpoint">
                <span class="method post">POST</span>
                <code>/auth/refresh</code>
                <p style="margin-top: 8px; color: #666;">Renovar access token</p>
              </div>
              
              <h3 style="margin-top: 20px; color: #666;">Archivos</h3>
              <div class="endpoint">
                <span class="method get">GET</span>
                <code>/api/files</code>
                <p style="margin-top: 8px; color: #666;">Listar archivos en la raíz</p>
              </div>
              <div class="endpoint">
                <span class="method get">GET</span>
                <code>/api/files/:folderId</code>
                <p style="margin-top: 8px; color: #666;">Listar archivos de una carpeta específica</p>
              </div>
              <div class="endpoint">
                <span class="method get">GET</span>
                <code>/api/file/:fileId</code>
                <p style="margin-top: 8px; color: #666;">Obtener información de un archivo</p>
              </div>
              <div class="endpoint">
                <span class="method get">GET</span>
                <code>/api/download/:fileId</code>
                <p style="margin-top: 8px; color: #666;">Obtener URL de descarga</p>
              </div>
              <div class="endpoint">
                <span class="method get">GET</span>
                <code>/api/search?q=texto</code>
                <p style="margin-top: 8px; color: #666;">Buscar archivos por nombre</p>
              </div>
            </div>
            
            <div class="card">
              <h2>📚 Documentación</h2>
              <p>Para más información sobre cómo usar esta API:</p>
              <ul>
                <li>📖 <a href="https://www.npmjs.com/package/onedrive-api" target="_blank">OneDrive API Package</a></li>
                <li>🔧 <a href="https://docs.microsoft.com/en-us/graph/api/resources/onedrive" target="_blank">Microsoft Graph API</a></li>
              </ul>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
});

module.exports = router;
