import crypto from 'crypto';
import path from 'path';

/**
 * Storage Provider Base Interface
 * Every storage provider must implement this contract.
 */
export class BaseStorageProvider {
  /**
   * Generates a strict, normalized, path-traversal-safe storage key
   */
  generateStorageKey(patientId, category = 'OTHER', fileName = 'document.pdf') {
    if (!patientId) throw new Error('patientId is required to generate storage key.');
    
    const cleanPatientId = String(patientId).replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanCategory = String(category).toUpperCase().replace(/[^A-Z0-9_]/g, '');
    
    // Strict filename sanitization: strip paths, non-ASCII, traversal tokens
    const basename = path.basename(String(fileName));
    const cleanFilename = basename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^\.+/, '') // avoid hidden files or relative paths
      .toLowerCase() || 'document.pdf';

    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    return `patients/${cleanPatientId}/${cleanCategory}/${timestamp}_${randomSuffix}_${cleanFilename}`;
  }

  async createUploadUrl(storageKey, mimeType, expiresIn) {
    throw new Error('createUploadUrl() not implemented in BaseStorageProvider');
  }

  async createDownloadUrl(storageKey, expiresIn) {
    throw new Error('createDownloadUrl() not implemented in BaseStorageProvider');
  }

  async saveFileBuffer(storageKey, buffer, mimeType) {
    throw new Error('saveFileBuffer() not implemented in BaseStorageProvider');
  }

  async fileExists(storageKey) {
    throw new Error('fileExists() not implemented in BaseStorageProvider');
  }

  async getMetadata(storageKey) {
    throw new Error('getMetadata() not implemented in BaseStorageProvider');
  }

  async deleteFile(storageKey) {
    throw new Error('deleteFile() not implemented in BaseStorageProvider');
  }
}
