const { simpleParser } = require('mailparser');
const axios = require('axios');
const dayjs = require('dayjs');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const { accessToken } = require('../../common/config/onedrive.config');

/**
 * Lista todos los archivos de la carpeta de hoy
 */
async function listFilesFromTodayFolder() {
  try {
    const folderName = getTodayFolderName();

    // Obtener todos los elementos de la raíz de OneDrive
    const rootResponse = await axios.get(
      'https://graph.microsoft.com/v1.0/me/drive/root/children',
      {
        headers: {
          'Authorization': `Bearer ${accessToken.get()}`
        }
      }
    );

    // Buscar la carpeta con nombre de hoy
    const folder = rootResponse.data.value.find(
      item => item.folder && item.name === folderName
    );

    if (!folder) {
      console.log(`No existe la carpeta: ${folderName}`);
      return [];
    }

    // Listar archivos dentro de la carpeta encontrada
    const filesResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/items/${folder.id}/children`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken.get()}`
        }
      }
    );

    const files = filesResponse.data.value.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      webUrl: file.webUrl
    }));

    const response = []
    Promise.all(files.map(async file => {
      const data = await convertAndUploadEml(file.id, folderName)
      response.push(data)
    }))

    return response
  } catch (error) {
    throw new Error(`Error listando archivos de la carpeta de hoy: ${error.message}`);
  }
}

/**
 * Descarga un archivo .eml de OneDrive
 */
async function downloadEmlFromOneDrive(fileId) {
  try {
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken.get()}`
        }
      }
    );

    const downloadUrl = response.data['@microsoft.graph.downloadUrl'];

    // Descargar el contenido del archivo
    const fileResponse = await axios.get(downloadUrl, {
      responseType: 'arraybuffer'
    });

    return {
      name: response.data.name,
      content: Buffer.from(fileResponse.data)
    };
  } catch (error) {
    throw new Error(`Error descargando archivo: ${error.message}`);
  }
}

/**
 * Convierte un archivo .eml a HTML formateado
 */
async function parseEmlToHtml(emlBuffer) {
  try {
    const parsed = await simpleParser(emlBuffer);

    // Formatear los adjuntos
    let attachmentsHtml = '';
    if (parsed.attachments && parsed.attachments.length > 0) {
      attachmentsHtml = `
        <div style="margin-top: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">📎 Adjuntos (${parsed.attachments.length})</h3>
          <ul style="list-style: none; padding: 0;">
            ${parsed.attachments.map(att => `
              <li style="padding: 10px; background: white; margin: 5px 0; border-radius: 4px; border-left: 3px solid #4CAF50;">
                <strong>${att.filename || 'Sin nombre'}</strong> 
                <span style="color: #666;">(${formatBytes(att.size)})</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // Crear HTML formateado
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            background-color: #ffffff;
          }
          .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .email-header h1 {
            margin: 0 0 20px 0;
            font-size: 24px;
            font-weight: 600;
          }
          .email-info {
            background-color: white;
            color: #333;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
          }
          .email-info-row {
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .email-info-row:last-child {
            border-bottom: none;
          }
          .email-info-label {
            font-weight: 600;
            min-width: 100px;
            color: #666;
          }
          .email-info-value {
            flex: 1;
            color: #333;
          }
          .email-body {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
          }
          .email-body img {
            max-width: 100%;
            height: auto;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #999;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="email-header">
          <h1>📧 ${escapeHtml(parsed.subject || 'Sin asunto')}</h1>
          <div class="email-info">
            <div class="email-info-row">
              <span class="email-info-label">De:</span>
              <span class="email-info-value">${formatAddress(parsed.from)}</span>
            </div>
            <div class="email-info-row">
              <span class="email-info-label">Para:</span>
              <span class="email-info-value">${formatAddresses(parsed.to)}</span>
            </div>
            ${parsed.cc ? `
              <div class="email-info-row">
                <span class="email-info-label">CC:</span>
                <span class="email-info-value">${formatAddresses(parsed.cc)}</span>
              </div>
            ` : ''}
            <div class="email-info-row">
              <span class="email-info-label">Fecha:</span>
              <span class="email-info-value">${parsed.date ? new Date(parsed.date).toLocaleString('es-ES') : 'N/A'}</span>
            </div>
          </div>
        </div>
        
        <div class="email-body">
          ${parsed.html || `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(parsed.text || 'Sin contenido')}</pre>`}
        </div>
        
        ${attachmentsHtml}
        
        <div class="footer">
          Convertido de EML a PDF | ${new Date().toLocaleString('es-ES')}
        </div>
      </body>
      </html>
    `;

    return html;
  } catch (error) {
    throw new Error(`Error parseando EML: ${error.message}`);
  }
}

/**
 * Convierte HTML a PDF usando Puppeteer
 */
async function htmlToPdf(html) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    if (browser) await browser.close();
    throw new Error(`Error generando PDF: ${error.message}`);
  }
}

/**
 * Convierte un archivo .eml a PDF (función principal)
 */
async function convertEmlToPdf(emlBuffer) {
  try {
    const html = await parseEmlToHtml(emlBuffer);
    const pdfBuffer = await htmlToPdf(html);

    const parsed = await simpleParser(emlBuffer);

    // Filtrar adjuntos PDF
    const pdfAttachments = (parsed.attachments || []).filter(att =>
      att.contentType === 'application/pdf' || (att.filename && att.filename.endsWith('.pdf'))
    );

    if (pdfAttachments.length === 0) {
      return pdfBuffer; // No hay PDFs, devolver solo el PDF del email
    }

    // Crear documento final combinando PDF del email + adjuntos
    const finalPdf = await PDFDocument.create();

    // Agregar PDF del email
    const emailPdf = await PDFDocument.load(pdfBuffer);
    const emailPages = await finalPdf.copyPages(emailPdf, emailPdf.getPageIndices());
    emailPages.forEach(page => finalPdf.addPage(page));

    // Agregar PDFs adjuntos
    for (const att of pdfAttachments) {
      const attachedPdf = await PDFDocument.load(att.content);
      const attachedPages = await finalPdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
      attachedPages.forEach(page => finalPdf.addPage(page));
    }

    const mergedPdfBuffer = await finalPdf.save();
    return mergedPdfBuffer;
  } catch (error) {
    throw new Error(`Error convirtiendo EML a PDF: ${error.message}`);
  }
}

/**
 * Busca o crea la carpeta en OneDrive
 */
async function findOrCreateFolder(folderName) {
  try {
    // Primero intentar buscar la carpeta
    const searchResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/root/children`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken.get()}`
        }
      }
    );

    const folder = searchResponse.data.value.find(
      item => item.folder && item.name.toLowerCase() === folderName.toLowerCase()
    );

    if (folder) {
      return folder.id;
    }

    // Si no existe, crear la carpeta
    const createResponse = await axios.post(
      `https://graph.microsoft.com/v1.0/me/drive/root/children`,
      {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken.get()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return createResponse.data.id;
  } catch (error) {
    throw new Error(`Error buscando/creando carpeta: ${error.message}`);
  }
}

/**
 * Sube un archivo PDF a OneDrive en la carpeta especificada
 */
async function uploadPdfToOneDrive(pdfBuffer, fileName, folderId) {
  try {
    const pdfFileName = fileName.replace('.eml', '.pdf');

    const response = await axios.put(
      `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${pdfFileName}:/content`,
      pdfBuffer,
      {
        headers: {
          'Authorization': `Bearer ${accessToken.get()}`,
          'Content-Type': 'application/pdf'
        }
      }
    );

    return {
      id: response.data.id,
      name: response.data.name,
      webUrl: response.data.webUrl,
      size: response.data.size
    };
  } catch (error) {
    throw new Error(`Error subiendo PDF: ${error.message}`);
  }
}

/**
 * Proceso completo: descarga EML, convierte a PDF y sube a OneDrive
 */
async function convertAndUploadEml(fileId, targetFolder) {
  try {
    console.log('1. Descargando archivo EML...');
    const emlFile = await downloadEmlFromOneDrive(fileId);

    console.log('2. Convirtiendo EML a PDF...');
    const pdfBuffer = await convertEmlToPdf(emlFile.content);

    console.log('3. Buscando/creando carpeta destino...');
    const folderId = await findOrCreateFolder(targetFolder);

    console.log('4. Subiendo PDF a OneDrive...');
    const uploadedFile = await uploadPdfToOneDrive(pdfBuffer, emlFile.name, folderId);

    return {
      success: true,
      originalFile: emlFile.name,
      convertedFile: uploadedFile.name,
      fileId: uploadedFile.id,
      webUrl: uploadedFile.webUrl,
      size: uploadedFile.size,
      folder: targetFolder
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Busca un archivo por nombre en OneDrive
 */
async function findFileByName(fileName) {
  try {
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(fileName)}')`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken.get()}`
        }
      }
    );

    const files = response.data.value.filter(item =>
      item.name.toLowerCase() === fileName.toLowerCase()
    );

    return files;
  } catch (error) {
    throw new Error(`Error buscando archivo: ${error.message}`);
  }
}

// Funciones auxiliares
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatAddress(address) {
  if (!address) return 'N/A';
  if (address.value && address.value.length > 0) {
    return address.value.map(a =>
      a.name ? `${a.name} &lt;${a.address}&gt;` : a.address
    ).join(', ');
  }
  if (address.text) return address.text;
  return 'N/A';
}

function formatAddresses(addresses) {
  if (!addresses) return 'N/A';
  if (Array.isArray(addresses)) {
    return addresses.map(a =>
      a.name ? `${a.name} &lt;${a.address}&gt;` : a.address
    ).join(', ');
  }
  return formatAddress(addresses);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getTodayFolderName() {
  return dayjs().format('MMMM D'); // ej: "November 12"
}


module.exports = {
  listFilesFromTodayFolder,
  downloadEmlFromOneDrive,
  convertEmlToPdf,
  uploadPdfToOneDrive,
  findOrCreateFolder,
  convertAndUploadEml,
  findFileByName
};