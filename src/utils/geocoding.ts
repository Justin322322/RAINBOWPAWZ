/**
 * Enhanced geocoding service with multiple open-source providers and fallbacks
 */

import { cacheManager } from '@/utils/cache';

interface GeocodingResult {
  coordinates: [number, number];
  formattedAddress: string;
  confidence: number;
  provider: string;
  accuracy: 'high' | 'medium' | 'low';
}

interface GeocodingError {
  message: string;
  code: 'NETWORK_ERROR' | 'NO_RESULTS' | 'RATE_LIMITED' | 'API_ERROR' | 'INVALID_ADDRESS';
  retryable: boolean;
}

class GeocodingService {
  private static instance: GeocodingService;
  private readonly DEFAULT_COORDINATES: [number, number] = [14.6742, 120.5434]; // Balanga City
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

  private constructor() {}

  public static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  /**
   * Main geocoding function with multiple providers and caching
   */
  public async geocodeAddress(address: string): Promise<GeocodingResult> {
    if (!address || address.trim() === '') {
      throw this.createError('Address cannot be empty', 'INVALID_ADDRESS', false);
    }

    // Check cache first
    const cached = cacheManager.getGeocodingCache(address);
    if (cached) {
      return {
        coordinates: cached.coordinates,
        formattedAddress: cached.formattedAddress,
        confidence: cached.confidence,
        provider: cached.provider,
        accuracy: this.getAccuracyFromConfidence(cached.confidence)
      };
    }

    // Try geocoding with our improved API
    try {
      const result = await this.geocodeWithImprovedAPI(address);

      // Cache successful result
      cacheManager.setGeocodingCache(address, {
        coordinates: result.coordinates,
        formattedAddress: result.formattedAddress,
        confidence: result.confidence,
        provider: result.provider
      });

      return result;
    } catch (error) {
      console.error('🗺️ [GeocodingService] Geocoding failed:', error);
      throw this.createError(
        error instanceof Error ? error.message : 'Geocoding failed',
        'API_ERROR',
        true
      );
    }
  }

  /**
   * Geocode using our improved API with multiple open-source providers
   */
  private async geocodeWithImprovedAPI(address: string): Promise<GeocodingResult> {
    const cleanAddress = this.cleanAddress(address);
    
    // Use our improved geocoding API endpoint
    const url = `/api/geocoding?address=${encodeURIComponent(cleanAddress)}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw this.createError('Rate limited', 'RATE_LIMITED', true);
        }
        if (response.status === 404) {
          throw this.createError('No results found', 'NO_RESULTS', false);
        }
        throw this.createError(`HTTP ${response.status}`, 'API_ERROR', true);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw this.createError('No results found', 'NO_RESULTS', false);
      }

      // Pick the best result based on confidence
      let bestResult = data[0];
      let bestConfidence = bestResult.confidence || 0.5;

      for (let i = 1; i < data.length; i++) {
        const confidence = data[i].confidence || 0.5;
        if (confidence > bestConfidence) {
          bestResult = data[i];
          bestConfidence = confidence;
        }
      }
      
      return {
        coordinates: [parseFloat(bestResult.lat), parseFloat(bestResult.lon)],
        formattedAddress: bestResult.display_name,
        confidence: bestConfidence,
        provider: bestResult.provider || 'unknown',
        accuracy: this.getAccuracyFromConfidence(bestConfidence)
      };
    } catch (error) {
      console.error('🗺️ [GeocodingService] Improved API geocoding failed:', error);
      
      // If our improved API fails, try simplified address as fallback
      try {
        return await this.trySimplifiedGeocoding(address);
      } catch (fallbackError) {
        console.error('🗺️ [GeocodingService] Fallback geocoding also failed:', fallbackError);
        throw error; // Re-throw the original error
      }
    }
  }

  /**
   * Try geocoding with simplified address as fallback
   */
  private async trySimplifiedGeocoding(address: string): Promise<GeocodingResult> {
    const parts = address.split(',');
    if (parts.length <= 1) {
      throw this.createError('No results found', 'NO_RESULTS', false);
    }

    // Try with just the last two parts (usually city and country)
    const simplifiedAddress = parts.slice(-2).join(',').trim();
    const url = `/api/geocoding?address=${encodeURIComponent(simplifiedAddress)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw this.createError(`HTTP ${response.status}`, 'API_ERROR', true);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw this.createError('No results found', 'NO_RESULTS', false);
    }

    const result = data[0];
    
    return {
      coordinates: [parseFloat(result.lat), parseFloat(result.lon)],
      formattedAddress: result.display_name,
      confidence: Math.max(0.3, (result.confidence || 0.5) - 0.2), // Lower confidence for simplified
      provider: result.provider || 'unknown',
      accuracy: 'medium'
    };
  }

  /**
   * Clean and normalize address for better geocoding
   */
  private cleanAddress(address: string): string {
    let cleaned = address
      .replace(/\s+/g, ' ')
      .replace(/[,\s]*,+[,\s]*/g, ', ') // Fix multiple commas
      .trim();

    // Standardize common abbreviations
    cleaned = cleaned
      .replace(/\bSt\.\s/gi, 'Street ')
      .replace(/\bAve\.\s/gi, 'Avenue ')
      .replace(/\bRd\.\s/gi, 'Road ')
      .replace(/\bBlvd\.\s/gi, 'Boulevard ')
      .replace(/\bBrgy\.\s/gi, 'Barangay ')
      .replace(/\bSubd\.\s/gi, 'Subdivision ')
      .replace(/\bPurok\s/gi, 'Purok ')
      .replace(/\bSitio\s/gi, 'Sitio ');

    // Add Philippines if not present
    if (!cleaned.toLowerCase().includes('philippines')) {
      cleaned = `${cleaned}, Philippines`;
    }

    // Add more specific location details for better accuracy
    if (cleaned.toLowerCase().includes('bataan')) {
      // Add postal code for Bataan if not present
      if (!cleaned.match(/\b21\d{2}\b/)) {
        cleaned = cleaned.replace('Philippines', '2100 Philippines');
      }
      
      // Add region for better context
      if (!cleaned.toLowerCase().includes('region') && !cleaned.toLowerCase().includes('central luzon')) {
        cleaned = cleaned.replace('Philippines', 'Central Luzon, Philippines');
      }
    }

    // Handle common city variations and add more specific location context
    cleaned = cleaned
      .replace(/\bBalanga\s+City\b/gi, 'Balanga, Bataan')
      .replace(/\bManila\s+City\b/gi, 'Manila, Metro Manila')
      .replace(/\bQuezon\s+City\b/gi, 'Quezon City, Metro Manila')
      .replace(/\bSamal,?\s*Bataan\b/gi, 'Samal, Bataan, Central Luzon')
      .replace(/\bAbucay,?\s*Bataan\b/gi, 'Abucay, Bataan, Central Luzon')
      .replace(/\bBagac,?\s*Bataan\b/gi, 'Bagac, Bataan, Central Luzon')
      .replace(/\bHermosa,?\s*Bataan\b/gi, 'Hermosa, Bataan, Central Luzon');

    return cleaned;
  }

  /**
   * Get accuracy level from confidence score
   */
  private getAccuracyFromConfidence(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Create a standardized error
   */
  private createError(message: string, code: GeocodingError['code'], retryable: boolean): GeocodingError {
    return { message, code, retryable };
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const geocodingService = GeocodingService.getInstance();
