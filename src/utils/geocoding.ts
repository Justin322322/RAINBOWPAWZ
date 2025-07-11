/**
 * Enhanced geocoding service with multiple providers and fallbacks
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
  private readonly GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
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

    // Try geocoding with multiple providers
    const providers = this.getGeocodingProviders();
    let lastError: GeocodingError | null = null;

    for (const provider of providers) {
      try {
        const result = await this.geocodeWithRetry(address, provider);

        // Cache successful result
        cacheManager.setGeocodingCache(address, {
          coordinates: result.coordinates,
          formattedAddress: result.formattedAddress,
          confidence: result.confidence,
          provider: result.provider
        });

        return result;
      } catch (error) {
        lastError = error as GeocodingError;


        // If rate limited, try next provider immediately
        if (lastError.code === 'RATE_LIMITED') {
          continue;
        }
      }
    }

    // All providers failed, return default location with warning
    return {
      coordinates: this.DEFAULT_COORDINATES,
      formattedAddress: 'Balanga City, Bataan, Philippines (Default Location)',
      confidence: 0.1,
      provider: 'default',
      accuracy: 'low'
    };
  }

  /**
   * Get available geocoding providers in order of preference
   */
  private getGeocodingProviders() {
    const providers = [];

    // Google Maps Geocoding (if API key available)
    if (this.GOOGLE_MAPS_API_KEY) {
      providers.push({
        name: 'google',
        geocode: this.geocodeWithGoogle.bind(this)
      });
    }

    // Nominatim (OpenStreetMap)
    providers.push({
      name: 'nominatim',
      geocode: this.geocodeWithNominatim.bind(this)
    });

    return providers;
  }

  /**
   * Geocode with retry logic
   */
  private async geocodeWithRetry(address: string, provider: any): Promise<GeocodingResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.RETRY_DELAYS.length; attempt++) {
      try {
        return await provider.geocode(address);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry for non-retryable errors
        if (error instanceof Error && 'retryable' in error && !error.retryable) {
          throw error;
        }

        // Wait before retry
        if (attempt < this.RETRY_DELAYS.length - 1) {
          await this.delay(this.RETRY_DELAYS[attempt]);
        }
      }
    }

    throw lastError;
  }

  /**
   * Geocode using Google Maps API
   */
  private async geocodeWithGoogle(address: string): Promise<GeocodingResult> {
    const cleanAddress = this.cleanAddress(address);
    // Enhanced parameters for better accuracy in Philippines
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanAddress)}&region=ph&bounds=14.0,120.0|15.0,121.0&language=en&key=${this.GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw this.createError('Rate limited', 'RATE_LIMITED', true);
      }
      throw this.createError(`HTTP ${response.status}`, 'API_ERROR', true);
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS') {
      throw this.createError('No results found', 'NO_RESULTS', false);
    }

    if (data.status !== 'OK') {
      throw this.createError(`API error: ${data.status}`, 'API_ERROR', true);
    }

    const result = data.results[0];
    const location = result.geometry.location;
    
    return {
      coordinates: [location.lat, location.lng],
      formattedAddress: result.formatted_address,
      confidence: this.calculateGoogleConfidence(result),
      provider: 'google',
      accuracy: this.getAccuracyFromConfidence(this.calculateGoogleConfidence(result))
    };
  }

  /**
   * Geocode using Nominatim (OpenStreetMap)
   */
  private async geocodeWithNominatim(address: string): Promise<GeocodingResult> {
    const cleanAddress = this.cleanAddress(address);
    // Enhanced bounds for better coverage of Bataan and surrounding areas
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddress)}&countrycodes=ph&viewbox=119.8,14.0,121.5,15.5&bounded=1&limit=3&addressdetails=1&dedupe=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RainbowPaws/1.0 (contact@rainbowpaws.com)'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw this.createError('Rate limited', 'RATE_LIMITED', true);
      }
      throw this.createError(`HTTP ${response.status}`, 'API_ERROR', true);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      // Try simplified address
      return this.trySimplifiedNominatim(address);
    }

    // Pick the best result based on confidence and relevance
    let bestResult = data[0];
    let bestConfidence = this.calculateNominatimConfidence(bestResult);

    for (let i = 1; i < data.length; i++) {
      const confidence = this.calculateNominatimConfidence(data[i]);
      if (confidence > bestConfidence) {
        bestResult = data[i];
        bestConfidence = confidence;
      }
    }
    
    return {
      coordinates: [parseFloat(bestResult.lat), parseFloat(bestResult.lon)],
      formattedAddress: bestResult.display_name,
      confidence: bestConfidence,
      provider: 'nominatim',
      accuracy: this.getAccuracyFromConfidence(bestConfidence)
    };
  }

  /**
   * Try geocoding with simplified address for Nominatim
   */
  private async trySimplifiedNominatim(address: string): Promise<GeocodingResult> {
    const parts = address.split(',');
    if (parts.length <= 1) {
      throw this.createError('No results found', 'NO_RESULTS', false);
    }

    const simplifiedAddress = parts.slice(-2).join(',').trim();
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(simplifiedAddress)}&countrycodes=ph&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RainbowPaws/1.0 (contact@rainbowpaws.com)'
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
      confidence: Math.max(0.3, this.calculateNominatimConfidence(result) - 0.2), // Lower confidence for simplified
      provider: 'nominatim',
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
      .replace(/\bSubd\.\s/gi, 'Subdivision ');

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
   * Calculate confidence score for Google results
   */
  private calculateGoogleConfidence(result: any): number {
    const locationType = result.geometry.location_type;
    switch (locationType) {
      case 'ROOFTOP': return 0.95;
      case 'RANGE_INTERPOLATED': return 0.85;
      case 'GEOMETRIC_CENTER': return 0.75;
      case 'APPROXIMATE': return 0.65;
      default: return 0.5;
    }
  }

  /**
   * Calculate confidence score for Nominatim results
   */
  private calculateNominatimConfidence(result: any): number {
    const importance = parseFloat(result.importance) || 0;
    const type = result.type || '';
    const addressType = result.addresstype || '';
    
    let confidence = Math.min(0.9, importance * 2);
    
    // Adjust based on place type for better accuracy
    if (type === 'house' || type === 'building' || addressType === 'house') confidence += 0.15;
    else if (type === 'amenity' || type === 'shop' || type === 'office') confidence += 0.1;
    else if (type === 'road' || type === 'street' || addressType === 'road') confidence += 0.05;
    else if (type === 'suburb' || type === 'neighbourhood') confidence += 0.02;
    else if (type === 'city' || type === 'town' || type === 'municipality') confidence -= 0.05;
    else if (type === 'state' || type === 'region') confidence -= 0.2;
    
    // Boost confidence for Philippine locations with detailed address components
    if (result.address && result.address.country_code === 'ph') {
      if (result.address.house_number) confidence += 0.1;
      if (result.address.road) confidence += 0.05;
      if (result.address.suburb || result.address.village) confidence += 0.03;
    }
    
    return Math.max(0.1, Math.min(0.95, confidence));
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
