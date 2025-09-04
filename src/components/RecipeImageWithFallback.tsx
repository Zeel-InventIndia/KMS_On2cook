import React, { useState, useEffect, useRef } from 'react';
import { getRecipeImageUrl, getSmartGoogleDriveUrlVariants } from '../utils/recipeImageMapping';
import fallbackRecipeImage from 'figma:asset/d2438cf8cbd3072879fe19c9a1ba1828bf039814.png';

// Additional fallback images for better UX
const ADDITIONAL_FALLBACKS = [
  'https://images.unsplash.com/photo-1629121291801-51c0c79f87d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNpcGUlMjBmb29kfGVufDF8fHx8MTc1NjQ1OTIwNXww&ixlib=rb-4.1.0&q=80&w=400',
  'https://images.unsplash.com/photo-1541963020-4f9732b3ee29?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWxpY2lvdXMlMjBmb29kfGVufDF8fHx8MTc1NjQ1OTIwOXww&ixlib=rb-4.1.0&q=80&w=400',
  'https://images.unsplash.com/photo-1717158776685-d4b7c346e1a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxyZXN0YXVyYW50JTIwZm9vZHxlbnwxfHx8fDE3NTY0NTkyMTR8MA&ixlib=rb-4.1.0&q=80&w=400'
];

interface Recipe {
  name: string;
  imageLink?: string;
}

interface RecipeImageWithFallbackProps {
  recipe: Recipe;
  className?: string;
  alt?: string;
}

export function RecipeImageWithFallback({ 
  recipe, 
  className = "w-full h-full object-cover",
  alt 
}: RecipeImageWithFallbackProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFailedUrl, setLastFailedUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 2; // Max retries per URL
  const loadTimeout = 10000; // 10 second timeout for image loading

  // Generate image URLs with fallbacks
  useEffect(() => {
    try {
      const mappedImageUrl = getRecipeImageUrl(recipe.name);
      const urls: string[] = [];
      
      if (mappedImageUrl) {
        // Get multiple variants of the mapped Google Drive URL using smart ordering
        const mappedVariants = getSmartGoogleDriveUrlVariants(mappedImageUrl);
        urls.push(...mappedVariants);
        console.log(`🎯 Using mapped image variants for ${recipe.name}:`, mappedVariants.length, 'variants (smart-ordered)');
      }
      
      if (recipe.imageLink && recipe.imageLink !== mappedImageUrl) {
        // Get variants of the original image link using smart ordering
        const originalVariants = getSmartGoogleDriveUrlVariants(recipe.imageLink);
        urls.push(...originalVariants);
        console.log(`🔄 Adding original image variants for ${recipe.name}:`, originalVariants.length, 'variants (smart-ordered)');
      }
      
      // Add multiple fallback images for better variety
      urls.push(...ADDITIONAL_FALLBACKS);
      
      // Add the main fallback image as absolute last resort
      urls.push(fallbackRecipeImage);
      
      // Remove any duplicates
      const uniqueUrls = Array.from(new Set(urls));
      
      setImageUrls(uniqueUrls);
      setCurrentImageIndex(0);
      setImageError(false);
      setIsLoading(true);
      setLastFailedUrl(null);
      setRetryCount(0);
      setErrorLog([]);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      console.log(`📋 Generated ${uniqueUrls.length} image URL variants for ${recipe.name}`);
    } catch (error) {
      console.error(`❌ Error generating image URLs for ${recipe.name}:`, error);
      // Fallback to just the fallback image
      setImageUrls([fallbackRecipeImage]);
      setCurrentImageIndex(0);
      setImageError(false);
      setIsLoading(true);
      setLastFailedUrl(null);
      setRetryCount(0);
      setErrorLog([]);
    }
  }, [recipe.name, recipe.imageLink]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleImageLoad = () => {
    // Clear loading timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsLoading(false);
    setImageError(false);
    setRetryCount(0);
    
    const currentUrl = imageUrls[currentImageIndex];
    const isUsingMappedImage = currentImageIndex < (getRecipeImageUrl(recipe.name) ? getSmartGoogleDriveUrlVariants(getRecipeImageUrl(recipe.name)!).length : 0);
    const isFallback = currentUrl === fallbackRecipeImage;
    
    console.log(`✅ Image loaded successfully for ${recipe.name}`, {
      imageIndex: currentImageIndex,
      totalVariants: imageUrls.length,
      url: currentUrl.substring(0, 80) + '...',
      source: isFallback ? 'fallback' : isUsingMappedImage ? 'mapped' : 'original',
      retriesUsed: retryCount > 0 ? retryCount : 'none'
    });
  };

  const handleImageError = () => {
    const currentUrl = imageUrls[currentImageIndex];
    setLastFailedUrl(currentUrl);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    const errorMessage = `Failed: ${currentUrl.substring(0, 60)}... (attempt ${retryCount + 1})`;
    setErrorLog(prev => [...prev, errorMessage]);
    
    console.error(`❌ Image failed to load for ${recipe.name}`, {
      failedUrl: currentUrl.substring(0, 80) + '...',
      imageIndex: currentImageIndex,
      totalVariants: imageUrls.length,
      retryCount: retryCount,
      willRetry: retryCount < maxRetries,
      willTryNext: currentImageIndex < imageUrls.length - 1
    });

    // Retry the current URL if we haven't exhausted retries
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setIsLoading(true);
      console.log(`🔄 Retrying current image for ${recipe.name} (retry ${retryCount + 1}/${maxRetries})`);
      
      // Force re-render by updating a state that triggers img src change
      setTimeout(() => {
        setIsLoading(true);
      }, 1000); // Wait 1 second before retry
      return;
    }

    // Reset retry count and try the next URL variant
    setRetryCount(0);
    if (currentImageIndex < imageUrls.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
      setIsLoading(true);
      console.log(`🔄 Trying next image variant for ${recipe.name} (${currentImageIndex + 1}/${imageUrls.length})`);
    } else {
      // All variants failed
      setImageError(true);
      setIsLoading(false);
      console.error(`💥 All image variants failed for ${recipe.name}. Errors:`, errorLog);
    }
  };

  const getCurrentImageUrl = () => {
    if (imageUrls.length === 0) return fallbackRecipeImage;
    return imageUrls[currentImageIndex] || fallbackRecipeImage;
  };

  const startLoadingTimeout = () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set a timeout to handle slow-loading images
    timeoutRef.current = setTimeout(() => {
      console.warn(`⏰ Image loading timeout for ${recipe.name} (${loadTimeout}ms)`);
      handleImageError(); // Treat timeout as an error
    }, loadTimeout);
  };

  // Prefetch the next few images to improve performance
  const prefetchNextImages = () => {
    const nextUrls = imageUrls.slice(currentImageIndex + 1, currentImageIndex + 3);
    nextUrls.forEach((url, index) => {
      if (url && url !== fallbackRecipeImage && !ADDITIONAL_FALLBACKS.includes(url)) {
        const img = new Image();
        img.src = url;
        // Silently prefetch - don't log errors for prefetches
        img.onerror = () => {};
        img.onload = () => {
          console.log(`📦 Prefetched next image ${index + 1} for ${recipe.name}`);
        };
      }
    });
  };

  // Start prefetching when we have URLs available
  useEffect(() => {
    if (imageUrls.length > 1 && currentImageIndex < imageUrls.length - 2) {
      const prefetchTimeout = setTimeout(prefetchNextImages, 2000); // Wait 2 seconds then prefetch
      return () => clearTimeout(prefetchTimeout);
    }
  }, [imageUrls, currentImageIndex]);

  const getImageSourceIndicator = () => {
    try {
      const currentUrl = getCurrentImageUrl();
      
      if (currentUrl === fallbackRecipeImage) {
        return '📷'; // Using fallback
      }
      
      const mappedImageUrl = getRecipeImageUrl(recipe.name);
      if (mappedImageUrl) {
        const mappedUrls = getSmartGoogleDriveUrlVariants(mappedImageUrl);
        if (mappedUrls.includes(currentUrl)) {
          return '🎯'; // Using mapped image
        }
      }
      
      return '✅'; // Using original image or other source
    } catch (error) {
      console.error('Error determining image source indicator:', error);
      return '❓'; // Unknown source
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
      
      {/* Main image */}
      <img
        key={`${currentImageIndex}-${retryCount}`} // Force re-render on retry
        src={getCurrentImageUrl()}
        alt={alt || recipe.name}
        className={className}
        onLoad={handleImageLoad}
        onError={handleImageError}
        onLoadStart={startLoadingTimeout}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        style={{ display: isLoading ? 'none' : 'block' }}
      />
      
      {/* Image source indicator */}
      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {getImageSourceIndicator()}
      </div>
      
      {/* Enhanced retry information */}
      {(currentImageIndex > 0 || retryCount > 0) && imageUrls.length > 1 && (
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          URL {currentImageIndex + 1}/{imageUrls.length}
          {retryCount > 0 && ` (R${retryCount})`}
        </div>
      )}
      
      {/* Error indicator when using fallback after failures */}
      {imageError && currentImageIndex === imageUrls.length - 1 && (
        <div className="absolute top-2 left-2 bg-red-500/80 text-white text-xs px-2 py-1 rounded">
          ⚠️ External images failed
        </div>
      )}
    </div>
  );
}