import crypto from 'crypto';
import { BaseStorageProvider } from './baseStorageProvider.js';

export class SupabaseStorageProvider extends BaseStorageProvider {
  constructor() {
    super();
    this.name = 'supabase';
    this.supabaseUrl = process.env.SUPABASE_URL || '';
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
    this.bucketName = process.env.SUPABASE_BUCKET || 'medical-records';
  }

  _getHeaders() {
    return {
      Authorization: `Bearer ${this.supabaseServiceKey}`,
      apikey: this.supabaseServiceKey,
    };
  }

  async createUploadUrl(storageKey, mimeType = 'application/pdf', expiresIn = 300) {
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      // Fallback for simulated/demo environment
      const expiresAtUnix = Math.floor(Date.now() / 1000) + expiresIn;
      return {
        provider: 'supabase',
        uploadUrl: `https://supabase.mock.storage/${this.bucketName}/${encodeURIComponent(storageKey)}?token=mock_signed_token`,
        storageKey,
        expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
        expiresIn,
      };
    }

    const endpoint = `${this.supabaseUrl}/storage/v1/object/upload/sign/${this.bucketName}/${encodeURIComponent(storageKey)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { ...this._getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn }),
    });

    const data = await response.json();
    const expiresAtUnix = Math.floor(Date.now() / 1000) + expiresIn;

    return {
      provider: 'supabase',
      uploadUrl: `${this.supabaseUrl}/storage/v1${data.url}`,
      storageKey,
      expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
      expiresIn,
    };
  }

  async createDownloadUrl(storageKey, expiresIn = 300) {
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      const expiresAtUnix = Math.floor(Date.now() / 1000) + expiresIn;
      return {
        provider: 'supabase',
        downloadUrl: `https://supabase.mock.storage/${this.bucketName}/${encodeURIComponent(storageKey)}?token=mock_signed_token`,
        storageKey,
        expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
        expiresIn,
      };
    }

    const endpoint = `${this.supabaseUrl}/storage/v1/object/sign/${this.bucketName}/${encodeURIComponent(storageKey)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { ...this._getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn }),
    });

    const data = await response.json();
    const expiresAtUnix = Math.floor(Date.now() / 1000) + expiresIn;

    return {
      provider: 'supabase',
      downloadUrl: `${this.supabaseUrl}/storage/v1${data.signedURL}`,
      storageKey,
      expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
      expiresIn,
    };
  }

  async saveFileBuffer(storageKey, buffer, mimeType = 'application/pdf') {
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const sizeBytes = buffer.length;

    if (this.supabaseUrl && this.supabaseServiceKey) {
      const endpoint = `${this.supabaseUrl}/storage/v1/object/${this.bucketName}/${encodeURIComponent(storageKey)}`;
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...this._getHeaders(),
          'Content-Type': mimeType,
          'x-upsert': 'true',
        },
        body: buffer,
      });
    }

    return {
      provider: 'supabase',
      storageKey,
      sizeBytes,
      checksum,
      mimeType,
    };
  }

  async fileExists(storageKey) {
    if (!this.supabaseUrl || !this.supabaseServiceKey) return true;
    try {
      const endpoint = `${this.supabaseUrl}/storage/v1/object/info/authenticated/${this.bucketName}/${encodeURIComponent(storageKey)}`;
      const res = await fetch(endpoint, { headers: this._getHeaders() });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async getMetadata(storageKey) {
    return {
      provider: 'supabase',
      storageKey,
      bucket: this.bucketName,
    };
  }

  async deleteFile(storageKey) {
    if (!this.supabaseUrl || !this.supabaseServiceKey) return true;
    const endpoint = `${this.supabaseUrl}/storage/v1/object/${this.bucketName}`;
    await fetch(endpoint, {
      method: 'DELETE',
      headers: { ...this._getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: [storageKey] }),
    });
    return true;
  }
}
