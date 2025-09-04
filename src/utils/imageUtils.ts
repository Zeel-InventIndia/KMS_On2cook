/**
 * Utility functions for handling image URLs, especially Google Drive links
 */

/**
 * Converts a Google Drive sharing URL to a direct image URL
 * @param url - The Google Drive sharing URL
 * @returns Direct image URL or the original URL if not a Google Drive link
 */
export function convertGoogleDriveUrl(url: string): string {
  if (!url) return url;
  
  console.log('Converting URL:', url);
  
  // Match Google Drive sharing URLs with various formats
  const driveRegex = /(?:https?:\/\/)?(?:www\.)?drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)(?:\/[^?]*)?(?:\?.*)?$/;
  const match = url.match(driveRegex);
  
  if (match && match[1]) {
    const fileId = match[1];
    console.log('Extracted file ID:', fileId);
    
    // Use thumbnail format which works best for Google Drive images
    // This format provides reliable image access: https://drive.google.com/thumbnail?id=FILE_ID&sz=w400
    const directUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
    console.log('Converted to thumbnail URL:', directUrl);
    return directUrl;
  }
  
  // Also try to match other Google Drive URL patterns
  const altRegex = /(?:https?:\/\/)?(?:www\.)?drive\.google\.com\/(?:open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/;
  const altMatch = url.match(altRegex);
  
  if (altMatch && altMatch[1]) {
    const fileId = altMatch[1];
    console.log('Extracted file ID (alt pattern):', fileId);
    const directUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
    console.log('Converted to thumbnail URL:', directUrl);
    return directUrl;
  }
  
  console.log('URL not recognized as Google Drive, returning original:', url);
  // Return original URL if it's not a Google Drive link
  return url;
}

/**
 * Gets alternative Google Drive URL formats for fallback
 * @param url - The Google Drive sharing URL
 * @returns Array of alternative URLs to try
 */
export function getAlternativeGoogleDriveUrls(url: string): string[] {
  if (!url || !isGoogleDriveUrl(url)) return [url];
  
  const driveRegex = /(?:https?:\/\/)?(?:www\.)?drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)(?:\/[^?]*)?(?:\?.*)?$/;
  const match = url.match(driveRegex);
  
  if (match && match[1]) {
    const fileId = match[1];
    
    return [
      // Format 1: Standard direct view
      `https://drive.google.com/uc?export=view&id=${fileId}`,
      // Format 2: Alternative direct format  
      `https://drive.google.com/uc?id=${fileId}`,
      // Format 3: Thumbnail format (might work for some files)
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
      // Format 4: Original URL as fallback
      url
    ];
  }
  
  return [url];
}

/**
 * Checks if a URL is a Google Drive URL
 * @param url - The URL to check
 * @returns True if it's a Google Drive URL
 */
export function isGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  return /drive\.google\.com/.test(url);
}

/**
 * Validates if a URL is likely to be an image
 * @param url - The URL to check
 * @returns True if the URL appears to be an image
 */
export function isImageUrl(url: string): boolean {
  if (!url) return false;
  
  // Check for image file extensions
  const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i;
  if (imageExtensions.test(url)) return true;
  
  // Check for Google Drive URLs (assuming they are images)
  if (isGoogleDriveUrl(url)) return true;
  
  // Check for other common image hosting patterns
  const imageHostingPatterns = [
    /imgur\.com/,
    /cloudinary\.com/,
    /amazonaws\.com/,
    /googleusercontent\.com/,
    /unsplash\.com/,
    /pexels\.com/
  ];
  
  return imageHostingPatterns.some(pattern => pattern.test(url));
}

/**
 * Gets a fallback image URL for broken images
 * @param recipeName - Name of the recipe for alt text context
 * @returns A placeholder image URL or data URL
 */
export function getFallbackImageUrl(recipeName?: string): string {
  // Return a simple SVG placeholder
  const placeholderSvg = `
    <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
            font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
        ${recipeName ? `Recipe: ${recipeName}` : 'Recipe Image'}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(placeholderSvg)}`;
}

/**
 * Tests if a Google Drive URL will work by making a quick fetch request
 * @param url - The URL to test
 * @returns Promise<boolean> indicating if the URL is accessible
 */
export async function testGoogleDriveUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'no-cors' // Use no-cors to avoid CORS issues
    });
    return true; // If no error, assume it's accessible
  } catch (error) {
    console.log('URL test failed:', error);
    return false;
  }
}