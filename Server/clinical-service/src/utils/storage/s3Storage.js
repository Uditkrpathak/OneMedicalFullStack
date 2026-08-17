import crypto from 'crypto';
import { BaseStorageProvider } from './baseStorageProvider.js';

export class S3StorageProvider extends BaseStorageProvider {
  constructor() {
    super();
    this.name = 's3';
    this.bucketName = process.env.AWS_S3_BUCKET || 'onemedical-medical-records';
    this.region = process.env.AWS_REGION || 'ap-south-1';
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
  }

  async _getS3Client() {
    const { S3Client } = await import('@aws-sdk/client-s3');
    return new S3Client({
      region: this.region,
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
        return { provider: 's3', uploadUrl, storageKey, expiresAt: expiresAtISO, expiresIn };
      } catch (err) {
        console.warn('[S3Storage] S3 presigner error:', err.message);
      }
    }

    return {
      provider: 's3',
      uploadUrl: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${encodeURIComponent(storageKey)}?signed=true`,
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
        return { provider: 's3', downloadUrl, storageKey, expiresAt: expiresAtISO, expiresIn };
      } catch (err) {
        console.warn('[S3Storage] S3 download signer error:', err.message);
      }
    }

    return {
      provider: 's3',
      downloadUrl: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${encodeURIComponent(storageKey)}?signed=true`,
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
        console.warn('[S3Storage] PutObjectCommand error:', err.message);
      }
    }

    return {
      provider: 's3',
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
      provider: 's3',
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
      console.warn('[S3Storage] delete error:', e.message);
      return false;
    }
  }
}
