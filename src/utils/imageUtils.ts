/**
 * Utility function to get the correct image URL
 * Uses the API route for proper CORS handling
 */
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';

  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Get base URL and add /api
  const baseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5006'}/api`;

  // Parse the path to extract type and filename
  // Expected format: /uploads/menu/filename.jpg or /uploads/restaurant/filename.jpg
  const pathMatch = imagePath.match(/^\/uploads\/([^\/]+)\/(.+)$/);

  if (pathMatch) {
    const [, type, filename] = pathMatch;
    return `${baseUrl}/files/${type}/${filename}`;
  }

  // Fallback: assume it's a menu image if no proper path structure
  const filename = imagePath.replace(/^\/uploads\/menu\//, '').replace(/^\//, '');
  return `${baseUrl}/files/menu/${filename}`;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate image file type
 */
export const isValidImageType = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
};

/**
 * Validate file size
 */
export const isValidFileSize = (file: File, maxSizeInMB: number = 5): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};
