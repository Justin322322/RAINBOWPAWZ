'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodingService } from '@/utils/geocoding';
import { routingService } from '@/utils/routing';
import { cacheManager } from '@/utils/cache';

// Fix for TypeScript error with Leaflet control
declare module 'leaflet' {
  namespace control {
    function create(options?: any): Control;
  }
}

interface ServiceProvider {
  id: number;
  name: string;
  address: string;
  type?: string;
  distance?: string;
  distanceValue?: number;
  packages?: number;
}

interface MapComponentProps {
  userAddress: string;
  userCoordinates?: [number, number]; // Optional coordinates if already available
  serviceProviders: ServiceProvider[];
  selectedProviderId?: number | null;
  filteredProviders?: ServiceProvider[]; // Optional filtered providers for map display
  maxDistance?: number | null; // Maximum distance filter for zoom adjustment
}

interface RouteInstructions {
  distance: string;
  duration: string;
  steps: Array<{
    instruction: string;
    distance: string;
    duration: string;
  }>;
}

export default function MapComponent({
  userAddress,
  userCoordinates: initialUserCoordinates,
  serviceProviders,
  selectedProviderId,
  filteredProviders,
  maxDistance
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const providerMarkersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<[number, number] | null>(null);
  const [providerCoordinates, setProviderCoordinates] = useState<Map<number, [number, number]>>(new Map());
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const [routeInstructions, setRouteInstructions] = useState<RouteInstructions | null>(null);
  const [selectedProviderName, setSelectedProviderName] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isMapLocked, setIsMapLocked] = useState(true); // Map is locked by default
  const [isRouting, setIsRouting] = useState(false);
  
  // Refs for proper cleanup
  const buttonEventListenersRef = useRef<{ element: HTMLElement; event: string; handler: () => void }[]>([]);
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]);
  const isRoutingRef = useRef(false); // Track routing state with ref to avoid dependency loops

  // Add user marker
  const addUserMarker = useCallback((coordinates: [number, number]) => {
    if (!mapRef.current) return;

    // Remove existing user marker if present
    if (userMarkerRef.current) {
      userMarkerRef.current.removeFrom(mapRef.current);
      userMarkerRef.current = null;
    }

    // Create user icon (green location pin)
    const userIcon = L.divIcon({
      className: 'custom-user-icon',
      html: `
        <div style="position: relative;">
          <div class="pulse-animation" style="position: absolute; width: 48px; height: 48px; border-radius: 50%; background-color: rgba(76, 175, 80, 0.3); top: -6px; left: -6px; transform-origin: center;"></div>
          <div style="width: 38px; height: 38px; background-color: #4CAF50; border-radius: 50% 50% 0 50%; transform: rotate(45deg); box-shadow: 0 3px 6px rgba(0,0,0,0.3);">
            <div style="position: absolute; top: 10px; left: 10px; width: 18px; height: 18px; background-color: white; border-radius: 50%; transform: rotate(-45deg);"></div>
          </div>
          <div style="position: absolute; top: -28px; left: 50%; transform: translateX(-50%); background-color: #4CAF50; color: white; padding: 3px 8px; border-radius: 4px; white-space: nowrap; font-weight: bold; font-size: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">Your Location</div>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.3); opacity: 0.3; }
            100% { transform: scale(1); opacity: 0.7; }
          }
          .pulse-animation {
            animation: pulse 2s infinite ease-in-out;
          }
        </style>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -38]
    });

    // Add new marker with high zIndex to ensure it stays on top
    userMarkerRef.current = L.marker([coordinates[0], coordinates[1]], {
      icon: userIcon,
      zIndexOffset: 1000 // This ensures the user location is always on top
    }).addTo(mapRef.current);
  }, []);

  // Enhanced geocoding function using the new geocoding service
  const geocodeAddressEnhanced = useCallback(async (address: string, type: 'user' | 'provider', providerId?: number) => {
    // If initial coordinates were provided, don't geocode user location to maintain consistency with API
    if (type === 'user' && (mapLoaded || initialUserCoordinates)) {
      return;
    }

    console.log(`🗺️ [MapComponent] Starting geocoding for ${type}: ${address}`);
    setIsGeocoding(true);
    setGeocodeError(null);
    setGeocodeAccuracy(null);

    try {
      const result = await geocodingService.geocodeAddress(address);
      console.log(`🗺️ [MapComponent] Geocoding successful for ${type}:`, result);



      // Clear any existing error messages for all accuracy levels
      setGeocodeError(null);

      if (type === 'user') {
        setUserCoordinates(result.coordinates);
        if (mapRef.current) {
          mapRef.current.setView(result.coordinates, 13);
          // Only add user marker if it doesn't exist or coordinates have changed
          if (!userMarkerRef.current) {
            addUserMarker(result.coordinates);
          } else {
            // Update existing marker position if coordinates have changed
            userMarkerRef.current.setLatLng([result.coordinates[0], result.coordinates[1]]);
          }
        }
      } else if (type === 'provider' && providerId !== undefined) {
        setProviderCoordinates(prev => {
          const newMap = new Map(prev);
          newMap.set(providerId, result.coordinates);
          return newMap;
        });
      }
    } catch (error) {
      console.error('🗺️ [MapComponent] Enhanced geocoding failed:', error);

      if (type === 'user') {
        setGeocodeError("Could not find your location. Please check your address in your profile.");

        // Don't use default coordinates - let the user know their address couldn't be found
        setUserCoordinates(null);
      }
    } finally {
      setIsGeocoding(false);
    }
  }, [mapLoaded, addUserMarker, initialUserCoordinates]);

  // Check if we're in a browser environment before initializing Leaflet
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (typeof window !== 'undefined' && !userCoordinates) {
      // If initial coordinates are provided, use them (these are the same coordinates used by the API)
      if (initialUserCoordinates) {
        setUserCoordinates(initialUserCoordinates);
      } else if (userAddress) {
        // Don't set default coordinates - only use the user's actual address
        // Geocode the user's address to get their actual location
        timer = setTimeout(() => {
          geocodeAddressEnhanced(userAddress, 'user');
        }, 100);
      }
    }

    // Cleanup function that always returns
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [userAddress, initialUserCoordinates, userCoordinates, geocodeAddressEnhanced]);

  // Initialize map with coordinates - optimized version
  const initializeMap = useCallback((coordinates: [number, number]) => {
    if (typeof window === 'undefined' || mapRef.current) return;

    try {
      // Check if container exists before initializing
      const container = document.getElementById('map-container');
      if (!container) {
        return;
      }

      // Using lower maxZoom improves performance
      mapRef.current = L.map('map-container', {
        center: coordinates,
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
        maxZoom: 18,
        preferCanvas: true, // Use canvas renderer for better performance
        scrollWheelZoom: false, // Disable scroll wheel zoom by default (locked)
        dragging: false // Disable dragging by default (locked)
      });

      // Add OpenStreetMap tiles with optimized settings
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
        minZoom: 10,
        updateWhenIdle: true,
        keepBuffer: 2
      }).addTo(mapRef.current);

      // We'll handle the event listeners in the useEffect to avoid duplicates

      // Add legend
      const legend = new L.Control({ position: 'bottomright' });
      legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = `
          <div style="background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); font-family: Arial, sans-serif;">
            <div style="margin-bottom: 12px; font-weight: bold; font-size: 14px; color: #2F7B5F;">Map Legend</div>
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <div style="width: 32px; height: 32px; background-color: #4CAF50; border-radius: 50% 50% 0 50%; transform: rotate(45deg); margin-right: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                <div style="position: absolute; top: 8px; left: 8px; width: 16px; height: 16px; background-color: white; border-radius: 50%; transform: rotate(-45deg);"></div>
              </div>
              <span style="font-size: 13px;">Your Location</span>
            </div>
            <div style="display: flex; align-items: center;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #2F7B5F; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; margin-right: 8px;">
                <img src="/logo.png" style="width: 26px; height: 26px; border-radius: 50%;" />
              </div>
              <span style="font-size: 13px;">Pet Cremation Center</span>
            </div>
          </div>
        `;
        return div;
      };
      legend.addTo(mapRef.current);

      // Make sure we only add the user marker once
      if (!userMarkerRef.current) {
        addUserMarker(coordinates);
      }

    } catch {
      setGeocodeError("Error loading map. Please refresh the page.");
    }
  }, [addUserMarker]);

  // Add provider markers to map with enhanced error handling and memory management
  const addProviderMarkers = useCallback(() => {
    if (!mapRef.current || providerCoordinates.size === 0) return;

    // Clear existing provider markers and their event listeners
    providerMarkersRef.current.forEach(marker => {
      if (mapRef.current) {
        marker.removeFrom(mapRef.current);
      }
    });
    providerMarkersRef.current = [];

    // Clear existing button event listeners
    buttonEventListenersRef.current.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    buttonEventListenersRef.current = [];

    // Clear any pending timeouts to prevent stale callbacks
    timeoutIdsRef.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    timeoutIdsRef.current = [];

    // Use filtered providers if provided, otherwise use all service providers
    const providersToShow = filteredProviders !== undefined ? filteredProviders : serviceProviders;
    
    // Only show markers for providers that have coordinates AND are in the filtered list
    providersToShow.forEach(provider => {
      const coordinates = providerCoordinates.get(provider.id);
      if (!coordinates) return;

      // Create simple marker with RainbowPaws logo
      const customIcon = L.divIcon({
        className: 'custom-provider-marker',
        html: `
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: #2F7B5F;
            border: 3px solid white;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <img src="/logo.png" style="width: 32px; height: 32px; border-radius: 50%;" />
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });

      // Create marker with simple popup
      const marker = L.marker([coordinates[0], coordinates[1]], {
        icon: customIcon
      }).addTo(mapRef.current!);

      // Add popup with provider info and get directions functionality
      marker.bindPopup(`
        <div style="text-align: center; padding: 8px;">
          <h3 style="color: #2F7B5F; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">${provider.name}</h3>
          <p style="color: #6b7280; font-size: 12px; margin: 0 0 12px 0;">${provider.address}</p>
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button id="directions-btn-${provider.id}" style="
              background: #2F7B5F;
              color: white;
              border: none;
              padding: 6px 10px;
              border-radius: 6px;
              font-size: 11px;
              cursor: pointer;
            ">Get Directions</button>
            <button onclick="window.location.href='/user/furparent_dashboard/services/${provider.id}'" style="
              background: #f3f4f6;
              color: #374151;
              border: 1px solid #d1d5db;
              padding: 6px 10px;
              border-radius: 6px;
              font-size: 11px;
              cursor: pointer;
            ">View Services</button>
          </div>
        </div>
      `);

      // Add click handler for directions button
      marker.on('popupopen', () => {
        const directionsBtn = document.getElementById(`directions-btn-${provider.id}`);
        if (directionsBtn) {
          directionsBtn.onclick = () => {
            setSelectedProviderName(provider.name);
            displayRouteToProviderEnhanced(coordinates, provider.name);
            marker.closePopup();
          };
        }
      });

      // Store marker reference
      providerMarkersRef.current.push(marker);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceProviders, filteredProviders, providerCoordinates]); // displayRouteToProviderEnhanced is accessed via closure to avoid circular dependency

  // Function to adjust map view to show all markers (user + providers)
  const adjustMapViewToShowAllMarkers = useCallback(() => {
    if (!mapRef.current || !userCoordinates) return;
  
    const providersToShow = filteredProviders !== undefined ? filteredProviders : serviceProviders;
    if (providersToShow.length === 0) {
      mapRef.current.setView(userCoordinates, 13); // Reset to user location if no providers shown
      return;
    }

    // Create bounds that include user location and all provider locations
    const bounds = L.latLngBounds([]);

    // Add user coordinates to bounds
    bounds.extend([userCoordinates[0], userCoordinates[1]]);

    // Add all visible provider coordinates to bounds
    providersToShow.forEach(provider => {
      const coords = providerCoordinates.get(provider.id);
      if (coords) {
        bounds.extend(coords);
      }
    });

    // Fit the map to show all markers with some padding
    // Use padding to ensure markers aren't right at the edge
    mapRef.current.fitBounds(bounds, {
      padding: [20, 20], // 20px padding on all sides
      maxZoom: 15 // Don't zoom in too much even if markers are close
    });
  }, [userCoordinates, providerCoordinates, serviceProviders, filteredProviders]);

  // Function to adjust map zoom based on distance filter
  const adjustMapZoomByDistance = useCallback(() => {
    if (!mapRef.current || !userCoordinates || !maxDistance) return;

    // Calculate appropriate zoom level based on distance
    // These zoom levels are approximate for different distances
    let zoomLevel: number;
    if (maxDistance <= 5) {
      zoomLevel = 14; // Close zoom for 5km
    } else if (maxDistance <= 10) {
      zoomLevel = 13; // Medium zoom for 10km
    } else if (maxDistance <= 20) {
      zoomLevel = 12; // Wide zoom for 20km
    } else if (maxDistance <= 50) {
      zoomLevel = 11; // Very wide zoom for 50km
    } else if (maxDistance <= 100) {
      zoomLevel = 10; // Ultra wide zoom for 100km
    } else {
      zoomLevel = 9; // Default very wide zoom
    }

    // Set view to user location with calculated zoom
    mapRef.current.setView(userCoordinates, zoomLevel);
  }, [userCoordinates, maxDistance]);

  // Enhanced function to display route on map using multiple routing services
  const displayRouteToProviderEnhanced = useCallback(async (providerCoords: [number, number], providerName: string) => {
    if (!mapRef.current || !userCoordinates) return;

    // Prevent multiple simultaneous routing requests
    if (isRoutingRef.current) {
      console.log('Route calculation already in progress, skipping...');
      return;
    }

    // Clear existing route
    if (routeLayerRef.current && mapRef.current) {
      routeLayerRef.current.removeFrom(mapRef.current);
      routeLayerRef.current = null;
    }

    // Set loading state
    setIsRouting(true);
    isRoutingRef.current = true;
    setRouteInstructions({ distance: "Calculating...", duration: "Calculating...", steps: [] });

    try {
      // Ensure we're using the current user marker position, not just the state
      const currentUserPosition = userMarkerRef.current?.getLatLng() ||
                                 { lat: userCoordinates[0], lng: userCoordinates[1] };

      const startCoords: [number, number] = [currentUserPosition.lat, currentUserPosition.lng];

      // Get route using the enhanced routing service
      const routeResult = await routingService.getRoute(startCoords, providerCoords, { trafficAware: true });

      // Check if component is still mounted and routing state is still active
      if (!mapRef.current || !isRoutingRef.current) {
        console.log('Component unmounted or routing cancelled, aborting route display');
        return;
      }

      // Create route polyline
      routeLayerRef.current = L.polyline(routeResult.route, {
        color: '#2F7B5F',
        weight: 5,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(mapRef.current!);

      // Zoom to fit the route with padding
      mapRef.current!.fitBounds(routeLayerRef.current.getBounds().pad(0.1));

      // Set route instructions
      setRouteInstructions({
        distance: routeResult.distance,
        duration: routeResult.duration,
        steps: routeResult.steps
      });

    } catch (error) {
      console.error('Enhanced routing failed:', error);

      // Show user-friendly error message
      setGeocodeError(`Could not calculate route to ${providerName}. Please try again later.`);
      setRouteInstructions(null);

      // Auto-hide error after 5 seconds
      setTimeout(() => {
        setGeocodeError(null);
      }, 5000);
    } finally {
      setIsRouting(false);
      isRoutingRef.current = false;
    }
  }, [userCoordinates]); // Removed isRouting to dependencies

  // When user coordinates change, update the marker
  useEffect(() => {
    if (userCoordinates && mapRef.current && mapLoaded) {
      // If there's already a user marker, update its position
      // otherwise create a new one
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userCoordinates[0], userCoordinates[1]]);
      } else {
        addUserMarker(userCoordinates);
      }
    }
  }, [userCoordinates, mapLoaded, addUserMarker]);

  // Initialize map when both userCoordinates and DOM are ready
  useEffect(() => {
    if (typeof window !== 'undefined' && userCoordinates && mapContainerRef.current && !mapLoaded) {
      // Check if map container exists before initializing
      const container = document.getElementById('map-container');
      if (container) {
        initializeMap(userCoordinates);
        setMapLoaded(true);
      }
    }
  }, [userCoordinates, mapLoaded, initializeMap]);

  // Geocode provider addresses efficiently with batching
  useEffect(() => {
    if (userCoordinates && serviceProviders.length > 0 && providerCoordinates.size === 0 && mapLoaded) {
      const geocodeProviders = async () => {
        // Process providers in batches of 3 to avoid rate limiting
        const batchSize = 3;
        for (let i = 0; i < serviceProviders.length; i += batchSize) {
          const batch = serviceProviders.slice(i, i + batchSize);

          // Process batch in parallel
          await Promise.all(
            batch.map(provider => geocodeAddressEnhanced(provider.address, 'provider', provider.id))
          );

          // Add delay between batches to avoid rate limiting
          if (i + batchSize < serviceProviders.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      };

      geocodeProviders();
    }
  }, [userCoordinates, serviceProviders, providerCoordinates, mapLoaded, geocodeAddressEnhanced]);

  // Update markers whenever provider coordinates change
  useEffect(() => {
    if (mapRef.current && providerCoordinates.size > 0) {
      addProviderMarkers();
      
      // Use distance-based zoom if maxDistance is set, otherwise auto-adjust to show all markers
      if (maxDistance) {
        adjustMapZoomByDistance();
      } else {
        // Auto-adjust zoom to show all markers when providers are loaded
        adjustMapViewToShowAllMarkers();
      }
    }
  }, [providerCoordinates, addProviderMarkers, adjustMapViewToShowAllMarkers, adjustMapZoomByDistance, filteredProviders, maxDistance]);

  // Handle maxDistance filter changes for immediate zoom adjustment
  useEffect(() => {
    if (mapRef.current && userCoordinates && maxDistance) {
      adjustMapZoomByDistance();
    }
  }, [maxDistance, adjustMapZoomByDistance, userCoordinates]);

  // Handle selectedProviderId changes - trigger directions when selected from card
  useEffect(() => {
    if (selectedProviderId && mapRef.current && providerCoordinates.size > 0 && mapLoaded && !isRoutingRef.current) {
      const coordinates = providerCoordinates.get(selectedProviderId);
      if (coordinates) {
        // Find the provider to get its name
        const provider = serviceProviders.find(p => p.id === selectedProviderId);
        if (provider) {
          setSelectedProviderName(provider.name);
          displayRouteToProviderEnhanced(coordinates, provider.name);
        }
      }
    }
  }, [selectedProviderId, providerCoordinates, mapLoaded, serviceProviders, displayRouteToProviderEnhanced]); // Removed isRouting dependency and now using ref

  // Initialize cache cleanup on component mount
  useEffect(() => {
    // Clean up expired cache entries on component mount
    cacheManager.cleanupExpiredEntries();
  }, []);

  // Clear route instructions and event listeners when component unmounts
  useEffect(() => {
    // Store references to the event listener functions
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') { // Meta for Mac
        if (mapRef.current) {
          mapRef.current.scrollWheelZoom.enable();
          mapRef.current.dragging.enable();
          setIsMapLocked(false);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') { // Meta for Mac
        if (mapRef.current) {
          mapRef.current.scrollWheelZoom.disable();
          mapRef.current.dragging.disable();
          setIsMapLocked(true);
        }
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      // Remove event listeners
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);

      // Clean up button event listeners to prevent memory leaks
      buttonEventListenersRef.current.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      buttonEventListenersRef.current = [];

      // Clear any pending timeouts
      timeoutIdsRef.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      timeoutIdsRef.current = [];

      // Clear provider markers and their event listeners
      providerMarkersRef.current.forEach(marker => {
        if (mapRef.current) {
          marker.removeFrom(mapRef.current);
        }
      });
      providerMarkersRef.current = [];

      // Clear route instructions
      setRouteInstructions(null);

      // Reset routing state
      setIsRouting(false);
      isRoutingRef.current = false;

      // Remove map
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div
        id="map-container"
        ref={mapContainerRef}
        className="w-full h-full rounded-lg overflow-hidden shadow-inner"
        style={{
          minHeight: '300px',
          height: 'clamp(300px, 50vh, 500px)'
        }}
      >
        {/* Map will be rendered here */}
      </div>

      {/* Map lock indicator - responsive */}
      <div
        className={`absolute top-2 sm:top-4 left-2 sm:left-12 bg-white px-2 sm:px-3 py-1 sm:py-1.5 rounded shadow-md z-[1000] text-xs sm:text-sm transition-opacity duration-300 ${isMapLocked ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex items-center gap-1 sm:gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-gray-700 hidden sm:inline">Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded-sm mx-0.5 text-xs font-mono">Ctrl</kbd> to interact with map</span>
          <span className="text-gray-700 sm:hidden">Ctrl to interact</span>
        </div>
      </div>

      {/* Notifications and directions */}
      {geocodeError && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          padding: '10px 15px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <div className="flex items-center gap-2">
            <span>{geocodeError}</span>
          </div>
        </div>
      )}

      {isGeocoding && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: '#e2e3e5',
          color: '#383d41',
          padding: '10px 15px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            <span>Finding locations...</span>
          </div>
        </div>
      )}

      {isRouting && (
        <div style={{
          position: 'absolute',
          top: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          padding: '10px 15px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Calculating route...</span>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {!mapLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          backgroundColor: 'white',
          padding: '15px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ color: '#2F7B5F', fontWeight: 'bold' }}>Loading map...</div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #2F7B5F',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Route instructions panel - responsive */}
      {routeInstructions && (
        <div className="absolute bottom-2 sm:bottom-4 left-2 right-2 sm:left-auto sm:right-4 bg-white rounded-lg shadow-lg p-3 sm:p-4 sm:max-w-xs max-h-[50%] sm:max-h-[60%] overflow-y-auto z-[1000] border-l-4 border-[#2F7B5F]">
          <div className="flex justify-between items-center mb-2 sm:mb-3">
            <h3 className="text-[#2F7B5F] font-bold text-xs sm:text-sm truncate pr-2">Directions to {selectedProviderName}</h3>
            <button
              className="text-gray-600 hover:text-gray-800 flex-shrink-0"
              onClick={() => setRouteInstructions(null)}
              aria-label="Close directions"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex justify-between text-xs bg-gray-100 p-2 rounded-md mb-3">
            <div className="font-medium">Distance: <span className="font-bold text-[#2F7B5F]">{routeInstructions.distance}</span></div>
            <div className="font-medium">Duration: <span className="font-bold text-[#2F7B5F]">{routeInstructions.duration}</span></div>
          </div>

          <div className="space-y-3 text-sm">
            {routeInstructions.steps.length === 0 ? (
              <div className="text-center py-4 text-gray-600">No detailed directions available for this route.</div>
            ) : (
              routeInstructions.steps.map((step, index) => (
                <div key={index} className="border-b border-gray-100 pb-2 last:border-0">
                  <div className="font-semibold text-gray-800 flex items-start">
                    <span className="flex items-center justify-center bg-[#2F7B5F] text-white rounded-full min-w-[20px] h-[20px] text-xs mr-2 mt-0.5">{index + 1}</span>
                    <span>{step.instruction}</span>
                  </div>
                  <div className="text-xs text-gray-600 flex justify-between mt-1 ml-7">
                    <span>{step.distance}</span>
                    <span>{step.duration}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
