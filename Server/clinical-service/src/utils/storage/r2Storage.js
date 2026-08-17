import crypto from 'crypto';
import { BaseStorageProvider } from './baseStorageProvider.js';

export class R2StorageProvider extends BaseStorageProvider {
  constructor() {
    super();
    this.name = 'r2';
    this.bucketName = process.env.R2_BUCKET || process.env.AWS_S3_BUCKET || 'onemedical-medical-records';
    this.accountId = process.env.R2_ACCOUNT_ID || '';
    this.accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
  }

  async _getS3Client() {
    const { S3Client } = await import('@aws-sdk/client-s3');
    const endpoint = this.accountId
      ? `https://${this.accountId}.r2.cloudflarestorage.com`
      : undefined;

    return new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
  }

  async createUploadUrl(storageKey, mimeType = 'application/pdf', expiresIn = 300) {
    const expiresAtUnix = Math.floor(Date.now() / 1000) + expiresIn;
    const expiresAtISO = new Date(expiresAtUnix * 1000).toISOString();

    if (this.accessKeyId && this.secretAccessKey) {
      try {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const s3 = await this._getS3Client();
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
          ContentType: mimeType,
        });
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
        return { provider: 'r2', uploadUrl, storageKey, expiresAt: expiresAtISO, expiresIn };
      } catch (err) {
        console.warn('[R2Storage] S3 presigner error, using mock token:', err.message);
      }
    }

    return {
      provider: 'r2',
      uploadUrl: `https://r2.mock.cloudflarestorage.com/${this.bucketName}/${encodeURIComponent(storageKey)}?signed=true`,
      storageKey,
      expiresAt: expiresAtISO,
      expiresIn,
    };
  }

  async createDownloadUrl(storageKey, expiresIn = 300) {
    const expiresAtUnix = Math.floor(Date.now() / 1000) + expiresIn;
    const expiresAtISO = new Date(expiresAtUnix * 1000).toISOString();

    if (this.accessKeyId && this.secretAccessKey) {
      try {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const s3 = await this._getS3Client();
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
        });
        const downloadUrl = await getSignedUrl(s3, command, { expiresIn });
        return { provider: 'r2', downloadUrl, storageKey, expiresAt: expiresAtISO, expiresIn };
      } catch (err) {
        console.warn('[R2Storage] S3 presigner error:', err.message);
      }
    }

    return {
      provider: 'r2',
      downloadUrl: `https://r2.mock.cloudflarestorage.com/${this.bucketName}/${encodeURIComponent(storageKey)}?signed=true`,
      storageKey,
      expiresAt: expiresAtISO,
      expiresIn,
    };
  }

  async saveFileBuffer(storageKey, buffer, mimeType = 'application/pdf') {
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const sizeBytes = buffer.length;

    if (this.accessKeyId && this.secretAccessKey) {
      try {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const s3 = await this._getS3Client();
        await s3.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: storageKey,
            Body: buffer,
            ContentType: mimeType,
          })
        );
      } catch (err) {
        console.warn('[R2Storage] PutObjectCommand error:', err.message);
      }
    }

    return {
      provider: 'r2',
      storageKey,
      sizeBytes,
      checksum,
      mimeType,
    };
  }

  async fileExists(storageKey) {
    if (!this.accessKeyId || !this.secretAccessKey) return true;
    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      const s3 = await this._getS3Client();
      await s3.send(new HeadObjectCommand({ Bucket: this.bucketName, Key: storageKey }));
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(storageKey) {
    return {
      provider: 'r2',
      storageKey,
      bucket: this.bucketName,
    };
  }

  async deleteFile(storageKey) {
    if (!this.accessKeyId || !this.secretAccessKey) return true;
    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const s3 = await this._getS3Client();
      await s3.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: storageKey }));
      return true;
    } catch (e) {
      console.warn('[R2Storage] delete error:', e.message);
      return false;
    }
  }
}
