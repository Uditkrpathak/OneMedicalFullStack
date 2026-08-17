import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { BaseStorageProvider } from './baseStorageProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_ROOT = path.resolve(__dirname, '../../../storage/medical-records');
const SIGNING_SECRET = process.env.STORAGE_SIGNING_SECRET || process.env.JWT_ACCESS_SECRET || 'onemedical_local_storage_secret_key_dev';
const BASE_URL = process.env.PUBLIC_SERVICE_URL || 'http://localhost:5003';

export class LocalStorageProvider extends BaseStorageProvider {
  constructor() {
    super();
    this.name = 'local';
    // Ensure base storage directory exists
    if (!fsSync.existsSync(STORAGE_ROOT)) {
      fsSync.mkdirSync(STORAGE_ROOT, { recursive: true });
    }
  }

  _resolveLocalPath(storageKey) {
    const safeKey = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, '');
    return path.join(STORAGE_ROOT, safeKey);
  }

  async createUploadUrl(storageKey, mimeType = 'application/pdf', expiresIn = 300) {
    const expiresAtUnix = Math.floor(Date.now() / 1000) + expiresIn;
    const payload = `PUT:${storageKey}:${mimeType}:${expiresAtUnix}`;
    const sig = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex');

    const uploadUrl = `${BASE_URL}/api/v1/storage/upload?key=${encodeURIComponent(storageKey)}&mime=${encodeURIComponent(mimeType)}&expires=${expiresAtUnix}&sig=${sig}`;

    return {
      provider: 'local',
      uploadUrl,
      storageKey,
      expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
      expiresIn,
    };
  }

  async createDownloadUrl(storageKey, expiresIn = 300) {
    const expiresAtUnix = Math.floor(Date.now() / 1000) + expiresIn;
    const payload = `GET:${storageKey}:${expiresAtUnix}`;
    const sig = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex');

    const downloadUrl = `${BASE_URL}/api/v1/storage/download?key=${encodeURIComponent(storageKey)}&expires=${expiresAtUnix}&sig=${sig}`;

    return {
      provider: 'local',
      downloadUrl,
      storageKey,
      expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
      expiresIn,
    };
  }

  async saveFileBuffer(storageKey, buffer, mimeType = 'application/pdf') {
    const fullPath = this._resolveLocalPath(storageKey);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const sizeBytes = buffer.length;

    return {
      provider: 'local',
      storageKey,
      sizeBytes,
      checksum,
      mimeType,
      fullPath,
    };
  }

  async fileExists(storageKey) {
    try {
      const fullPath = this._resolveLocalPath(storageKey);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(storageKey) {
    const fullPath = this._resolveLocalPath(storageKey);
    const stat = await fs.stat(fullPath);
    const content = await fs.readFile(fullPath);
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    return {
      provider: 'local',
      storageKey,
      sizeBytes: stat.size,
      checksum,
      createdAt: stat.birthtime,
      updatedAt: stat.mtime,
    };
  }

  async deleteFile(storageKey) {
    try {
      const fullPath = this._resolveLocalPath(storageKey);
      await fs.unlink(fullPath);
      return true;
    } catch (e) {
      if (e.code === 'ENOENT') return true; // already deleted
      throw e;
    }
  }
}
