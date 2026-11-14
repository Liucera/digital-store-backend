const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const env = require('../config/env');
const HttpError = require('./HttpError');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS = Object.freeze({
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg'
});
const FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpg)$/i;

function decodeImage(type, content) {
  if (!Object.hasOwn(MIME_EXTENSIONS, type)) {
    throw new HttpError(400, 'A imagem deve ser PNG ou JPEG.');
  }
  if (typeof content !== 'string' || content.length === 0 ||
      content.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 ||
      content.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(content)) {
    throw new HttpError(400, 'Envie uma imagem em base64 puro com até 5 MB.');
  }
  const buffer = Buffer.from(content, 'base64');
  if (buffer.length > MAX_IMAGE_BYTES || buffer.toString('base64') !== content) {
    throw new HttpError(400, 'Envie uma imagem em base64 puro com até 5 MB.');
  }

  const extension = MIME_EXTENSIONS[type];
  const isPng = buffer.length >= 24 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    buffer.subarray(12, 16).toString('ascii') === 'IHDR';
  const isJpeg = buffer.length >= 4 && buffer[0] === 0xff &&
    buffer[1] === 0xd8 && buffer[2] === 0xff &&
    buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
  if ((extension === 'png' && !isPng) || (extension === 'jpg' && !isJpeg)) {
    throw new HttpError(400, 'O conteúdo da imagem não corresponde ao tipo informado.');
  }
  return { buffer, extension };
}

async function saveImage(decoded) {
  const filename = `${randomUUID()}.${decoded.extension}`;
  await fs.mkdir(env.uploadDir, { recursive: true });
  // Nomes aleatórios e criação exclusiva evitam sobrescrever arquivos existentes.
  const destination = path.join(env.uploadDir, filename);
  const file = await fs.open(destination, 'wx');
  try {
    await file.writeFile(decoded.buffer);
    await file.close();
  } catch (error) {
    await file.close().catch(() => {});
    await fs.unlink(destination).catch(() => {});
    throw error;
  }
  return filename;
}

function assertFilename(filename) {
  if (typeof filename !== 'string' || path.basename(filename) !== filename || !FILE_PATTERN.test(filename)) {
    throw new Error('Caminho de imagem inválido.');
  }
}

async function removeImage(filename) {
  assertFilename(filename);
  try {
    await fs.unlink(path.join(env.uploadDir, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function imageUrl(filename) {
  assertFilename(filename);
  const baseUrl = (env.publicBaseUrl || '').replace(/\/+$/, '');
  return `${baseUrl}/uploads/${encodeURIComponent(filename)}`;
}

module.exports = { decodeImage, saveImage, removeImage, imageUrl };
