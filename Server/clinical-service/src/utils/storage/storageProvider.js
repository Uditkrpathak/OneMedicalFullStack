import { CloudinaryStorageProvider } from './cloudinaryStorage.js';
import { LocalStorageProvider } from './localStorage.js';
import { SupabaseStorageProvider } from './supabaseStorage.js';
import { R2StorageProvider } from './r2Storage.js';
import { S3StorageProvider } from './s3Storage.js';

let activeProviderInstance = null;

/**
 * Get or instantiate the active storage provider according to STORAGE_PROVIDER env
 * Options: 'cloudinary' (default) | 'local' | 'supabase' | 'r2' | 's3'
 */
export const getStorageProvider = (providerName) => {
  const selected = providerName || process.env.STORAGE_PROVIDER || 'cloudinary';

  if (activeProviderInstance && activeProviderInstance.name === selected) {
    return activeProviderInstance;
  }

  switch (selected.toLowerCase()) {
    case 'cloudinary':
      activeProviderInstance = new CloudinaryStorageProvider();
      break;
    case 'supabase':
      activeProviderInstance = new SupabaseStorageProvider();
      break;
    case 'r2':
      activeProviderInstance = new R2StorageProvider();
      break;
    case 's3':
    case 'aws':
      activeProviderInstance = new S3StorageProvider();
      break;
    case 'local':
    default:
      activeProviderInstance = new LocalStorageProvider();
      break;
  }

  return activeProviderInstance;
};

// Default export active provider singleton
export default getStorageProvider();
