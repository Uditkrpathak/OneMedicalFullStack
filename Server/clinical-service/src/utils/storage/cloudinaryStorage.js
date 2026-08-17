import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { BaseStorageProvider } from './baseStorageProvider.js';

export class CloudinaryStorageProvider extends BaseStorageProvider {
  constructor() {
    super();
    this.name = 'cloudinary';
    this.cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    this.apiKey = process.env.CLOUDINARY_API_KEY || '';
    this.apiSecret = process.env.CLOUDINARY_API_SECRET || '';

    if (this.cloudName && this.apiKey && this.apiSecret) {
      cloudinary.config({
        cloud_name: this.cloudName,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        secure: true,
      });
    }
  }

  _isConfigured() {
    return Boolean(this.cloudName && this.apiKey && this.apiSecret);
  }

  /**
   * Generates a signed direct upload payload for the client
   */
  async createUploadUrl(storageKey, mimeType = 'application/pdf', expiresIn = 300) {
    const timestamp = Math.floor(Date.now() / 1000);
    const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';

    if (this._isConfigured()) {
      const paramsToSign = {
        public_id: storageKey,
        timestamp,
        type: 'authenticated', // private medical records
      };

      const signature = cloudinary.utils.api_sign_request(paramsToSign, this.apiSecret);

      return {
        provider: 'cloudinary',
        uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`,
        storageKey,
        publicId: storageKey,
        apiKey: this.apiKey,
        timestamp,
        signature,
        type: 'authenticated',
        expiresAt: new Date((timestamp + expiresIn) * 1000).toISOString(),
        expiresIn,
      };
    }

    // Deterministic mock for local test/dev when credentials not yet set
    return {
      provider: 'cloudinary',
      uploadUrl: `https://api.cloudinary.com/v1_1/onemedical-mock/${resourceType}/upload`,
      storageKey,
      publicId: storageKey,
      apiKey: 'mock_api_key',
      timestamp,
      signature: 'mock_signature',
      type: 'authenticated',
      expiresAt: new Date((timestamp + expiresIn) * 1000).toISOString(),
      expiresIn,
    };
  }

  /**
   * Generates a short-lived authenticated access URL (expires in 300s)
   */
  async createDownloadUrl(storageKey, expiresIn = 300) {
    const expiresAtUnix = Math.floor(Date.now() / 1000) + expiresIn;
    const expiresAtISO = new Date(expiresAtUnix * 1000).toISOString();

    const isImage = storageKey.match(/\.(jpg|jpeg|png|webp)$/i);
    const resourceType = isImage ? 'image' : 'raw';

    if (this._isConfigured()) {
      try {
        const downloadUrl = cloudinary.utils.private_download_url(storageKey, isImage ? 'jpg' : 'pdf', {
          resource_type: resourceType,
          type: 'authenticated',
          expires_at: expiresAtUnix,
        });

        return {
          provider: 'cloudinary',
          downloadUrl,
          storageKey,
          expiresAt: expiresAtISO,
          expiresIn,
        };
      } catch (err) {
        console.warn('[CloudinaryStorage] private_download_url warning:', err.message);
      }
    }

    return {
      provider: 'cloudinary',
      downloadUrl: `https://res.cloudinary.com/${this.cloudName || 'onemedical'}/${resourceType}/authenticated/s--mock--/${encodeURIComponent(storageKey)}?expires=${expiresAtUnix}`,
      storageKey,
      expiresAt: expiresAtISO,
      expiresIn,
    };
  }

  /**
   * Uploads a Buffer (such as generated Consultation Report) directly to Cloudinary
   */
  async saveFileBuffer(storageKey, buffer, mimeType = 'application/pdf') {
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const sizeBytes = buffer.length;
    const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';

    if (this._isConfigured()) {
      await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: storageKey,
            resource_type: resourceType,
            type: 'authenticated',
            overwrite: true,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(buffer);
      });
    }

    return {
      provider: 'cloudinary',
      storageKey,
      cloudinaryPublicId: storageKey,
      resourceType,
      sizeBytes,
      checksum,
      mimeType,
    };
  }

  /**
   * Check if file exists in Cloudinary
   */
  async fileExists(storageKey) {
    if (!this._isConfigured()) return true;
    try {
      const isImage = storageKey.match(/\.(jpg|jpeg|png|webp)$/i);
      const res = await cloudinary.api.resource(storageKey, {
        resource_type: isImage ? 'image' : 'raw',
        type: 'authenticated',
      });
      return Boolean(res && res.public_id);
    } catch {
      return false;
    }
  }

  /**
   * Fetch resource metadata
   */
  async getMetadata(storageKey) {
    if (!this._isConfigured()) {
      return {
        provider: 'cloudinary',
        storageKey,
        resourceType: 'raw',
      };
    }

    const isImage = storageKey.match(/\.(jpg|jpeg|png|webp)$/i);
    const resource = await cloudinary.api.resource(storageKey, {
      resource_type: isImage ? 'image' : 'raw',
      type: 'authenticated',
    });

    return {
      provider: 'cloudinary',
      storageKey: resource.public_id,
      sizeBytes: resource.bytes,
      format: resource.format,
      resourceType: resource.resource_type,
      createdAt: resource.created_at,
    };
  }

  /**
   * Deletes file from Cloudinary
   */
  async deleteFile(storageKey) {
    if (!this._isConfigured()) return true;
    try {
      const isImage = storageKey.match(/\.(jpg|jpeg|png|webp)$/i);
      await cloudinary.uploader.destroy(storageKey, {
        resource_type: isImage ? 'image' : 'raw',
        type: 'authenticated',
      });
      return true;
    } catch (e) {
      console.warn('[CloudinaryStorage] deleteFile error:', e.message);
      return false;
    }
  }
}
