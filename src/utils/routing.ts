/**
 * Enhanced routing service with multiple providers and caching
 */

import { cacheManager } from '@/utils/cache';

interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
  coordinates?: [number, number];
}

interface RoutingResult {
  route: [number, number][];
  distance: string;
  duration: string;
  steps: RouteStep[];
  provider: string;
  trafficAware: boolean;
}

interface RoutingError {
  message: string;
  code: 'NETWORK_ERROR' | 'NO_ROUTE' | 'RATE_LIMITED' | 'API_ERROR';
  retryable: boolean;
}

interface RoutingOptions {
  trafficAware?: boolean;
  timeout?: number;
}

interface RoutingProvider {
  name: string;
  route: (
    start: [number, number],
    end: [number, number],
    options: RoutingOptions
  ) => Promise<RoutingResult>;
}

class RoutingService {
  private static instance: RoutingService;
  private readonly MAPBOX_API_KEY = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
  private readonly RETRY_DELAYS = [1000, 2000, 4000];

  private constructor() {}

  public static getInstance(): RoutingService {
    if (!RoutingService.instance) {
      RoutingService.instance = new RoutingService();
    }
    return RoutingService.instance;
  }

  /**
   * Get route between two points with enhanced caching and timeout handling
   */
  public async getRoute(
    start: [number, number],
    end: [number, number],
    options: { trafficAware?: boolean; timeout?: number } = {}
  ): Promise<RoutingResult> {
    const trafficAware = options.trafficAware || false;
    const timeout = options.timeout || 5000; // Default 5 second timeout

    // Check cache first with trafficAware parameter
    const cached = cacheManager.getRoutingCache(start, end, trafficAware);
    if (cached) {
      console.log(`📍 [Cache Hit] Route found in cache for ${start} -> ${end}`);
      return {
        route: cached.route,
        distance: cached.distance,
        duration: cached.duration,
        steps: cached.steps,
        provider: 'cached',
        trafficAware: cached.trafficAware
      };
    }

    // Try routing with multiple providers with timeout
    const providers = this.getRoutingProviders();
    let lastError: RoutingError | null = null;

    for (const provider of providers) {
      try {
        // Create timeout promise with cleanup
        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(this.createError(`Routing timeout after ${timeout}ms`, 'NETWORK_ERROR', true));
          }, timeout);
        });

        // Race the routing call against timeout
        const result = await Promise.race([
          this.routeWithRetry(start, end, provider, options),
          timeoutPromise
        ]);

        // Clear timeout since routing completed successfully
        clearTimeout(timeoutId);

        // Cache successful result with trafficAware value
        cacheManager.setRoutingCache(start, end, {
          route: result.route,
          distance: result.distance,
          duration: result.duration,
          steps: result.steps,
          trafficAware: result.trafficAware
        });

        console.log(`📍 [Cache Set] Route cached for ${start} -> ${end} via ${provider.name}`);
        return result;
      } catch (error) {
        lastError = error as RoutingError;
        console.warn(`Routing failed with ${provider.name}:`, error);

        // If rate limited or timeout, try next provider immediately
        if (lastError.code === 'RATE_LIMITED' || lastError.code === 'NETWORK_ERROR') {
          continue;
        }
      }
    }

    throw lastError || this.createError('All routing providers failed', 'API_ERROR', false);
  }

  /**
   * Background route calculation for preloading common routes
   * This doesn't block the main request but populates cache for future use
   */
  public async preloadRoute(
    start: [number, number],
    end: [number, number],
    options: { trafficAware?: boolean } = {}
  ): Promise<void> {
    try {
      // Check if already cached
      const cached = cacheManager.getRoutingCache(start, end, options.trafficAware || false);
      if (cached) {
        return; // Already cached, no need to preload
      }

      // Run in background without blocking
      this.getRoute(start, end, { ...options, timeout: 10000 }) // Longer timeout for background
        .then(() => {
          console.log(`📍 [Preload] Successfully preloaded route ${start} -> ${end}`);
        })
        .catch((error) => {
          console.warn(`📍 [Preload] Failed to preload route ${start} -> ${end}:`, error);
        });
    } catch (error) {
      console.warn(`📍 [Preload] Error initiating preload for ${start} -> ${end}:`, error);
    }
  }

  /**
   * Get available routing providers in order of preference
   */
  private getRoutingProviders(): RoutingProvider[] {
    const providers: RoutingProvider[] = [];

    // MapBox Directions (if API key available)
    if (this.MAPBOX_API_KEY) {
      providers.push({
        name: 'mapbox',
        route: this.routeWithMapbox.bind(this)
      });
    }

    // OSRM (OpenStreetMap Routing Machine)
    providers.push({
      name: 'osrm',
      route: this.routeWithOSRM.bind(this)
    });

    return providers;
  }

  /**
   * Route with retry logic
   */
  private async routeWithRetry(
    start: [number, number],
    end: [number, number],
    provider: RoutingProvider,
    options: RoutingOptions
  ): Promise<RoutingResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.RETRY_DELAYS.length; attempt++) {
      try {
        return await provider.route(start, end, options);
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
   * Route using MapBox Directions API
   */
  private async routeWithMapbox(
    start: [number, number], 
    end: [number, number],
    options: { trafficAware?: boolean } = {}
  ): Promise<RoutingResult> {
    const profile = options.trafficAware ? 'driving-traffic' : 'driving';
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start[1]},${start[0]};${end[1]},${end[0]}?steps=true&geometries=geojson&access_token=${this.MAPBOX_API_KEY}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw this.createError('Rate limited', 'RATE_LIMITED', true);
      }
      throw this.createError(`HTTP ${response.status}`, 'API_ERROR', true);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw this.createError('No route found', 'NO_ROUTE', false);
    }

    const route = data.routes[0];
    const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
    
    const steps = route.legs[0].steps.map((step: any) => ({
      instruction: step.maneuver.instruction || 'Continue',
      distance: this.formatDistance(step.distance),
      duration: this.formatDuration(step.duration),
      coordinates: step.maneuver.location ? [step.maneuver.location[1], step.maneuver.location[0]] : undefined
    }));

    return {
      route: coordinates,
      distance: this.formatDistance(route.distance),
      duration: this.formatDuration(route.duration, options.trafficAware),
      steps,
      provider: 'mapbox',
      trafficAware: options.trafficAware || false
    };
  }

  /**
   * Route using OSRM
   */
  private async routeWithOSRM(
    start: [number, number], 
    end: [number, number],
    _options: { trafficAware?: boolean } = {}
  ): Promise<RoutingResult> {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true&annotations=true`;

    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw this.createError('Rate limited', 'RATE_LIMITED', true);
      }
      throw this.createError(`HTTP ${response.status}`, 'API_ERROR', true);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw this.createError('No route found', 'NO_ROUTE', false);
    }

    const route = data.routes[0];
    const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
    
    const steps = route.legs[0].steps
      .map((step: any) => ({
        instruction: step.maneuver.instruction || step.name || 'Continue',
        distance: this.formatDistance(step.distance),
        duration: this.formatDuration(step.duration, false, step.distance),
        coordinates: step.maneuver.location ? [step.maneuver.location[1], step.maneuver.location[0]] : undefined
      }))
      .filter((step: RouteStep) => {
        // Filter out very short steps
        const distanceValue = parseFloat(step.distance);
        return distanceValue > 5 || step.distance.includes('km');
      });

    return {
      route: coordinates,
      distance: this.formatDistance(route.legs[0].distance),
      duration: this.formatDuration(route.legs[0].duration, false, route.legs[0].distance),
      steps,
      provider: 'osrm',
      trafficAware: false
    };
  }

  /**
   * Format distance in meters to human-readable format
   */
  private formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  }

  /**
   * Format duration with traffic considerations
   */
  private formatDuration(seconds: number, trafficAware: boolean = false, distance: number = 0): string {
    let adjustedSeconds = seconds;

    // Apply traffic factor for OSRM (which doesn't include traffic)
    if (!trafficAware && distance > 0) {
      adjustedSeconds = this.applyTrafficFactor(seconds, distance);
    }

    if (adjustedSeconds < 60) {
      return `${Math.round(adjustedSeconds)} sec`;
    }

    const minutes = Math.floor(adjustedSeconds / 60);
    if (minutes < 60) {
      const remainingSeconds = Math.round(adjustedSeconds % 60);
      if (remainingSeconds > 0) {
        return `${minutes} min ${remainingSeconds} sec`;
      }
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes > 0) {
        return `${hours} hr ${remainingMinutes} min`;
      }
      return `${hours} hr`;
    }
  }

  /**
   * Apply realistic traffic factor to duration
   */
  private applyTrafficFactor(seconds: number, distance: number): number {
    // Base traffic factor
    let trafficFactor = 1.6;

    // Time-of-day adjustment
    const hour = new Date().getHours();
    let timeOfDayFactor = 1.0;

    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
      timeOfDayFactor = 1.3; // Rush hour
    } else if ((hour >= 10 && hour <= 15) || (hour >= 20 && hour <= 22)) {
      timeOfDayFactor = 1.1; // Moderate traffic
    }

    // Add time for intersections
    const intersections = Math.ceil(distance / 400); // One intersection every 400m
    const intersectionTime = intersections * 12; // 12 seconds average wait

    return (seconds * trafficFactor * timeOfDayFactor) + intersectionTime;
  }

  /**
   * Create a standardized error
   */
  private createError(message: string, code: RoutingError['code'], retryable: boolean): RoutingError {
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
export const routingService = RoutingService.getInstance();
