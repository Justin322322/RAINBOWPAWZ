'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
}

interface MapComponentProps {
  userAddress: string;
  userCoordinates?: [number, number]; // Optional coordinates if already available
  serviceProviders: ServiceProvider[];
  selectedProviderId?: number | null;
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
  selectedProviderId
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

  // Check if we're in a browser environment before initializing Leaflet
  useEffect(() => {
    if (typeof window !== 'undefined' && !userCoordinates) {
      // If initial coordinates are provided, use them
      if (initialUserCoordinates) {
        setUserCoordinates(initialUserCoordinates);
      } else if (userAddress) {
        // Otherwise, set default coordinates first to prevent error if geocoding fails
        const defaultCoordinates: [number, number] = [14.6742, 120.5434]; // Balanga City center coordinates
        setUserCoordinates(defaultCoordinates);

        // Delayed geocoding to ensure DOM is ready
        const timer = setTimeout(() => {
          geocodeAddress(userAddress, 'user');
        }, 100);

        return () => clearTimeout(timer);
      }
    }
  }, [userAddress, initialUserCoordinates]);

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
  }, [userCoordinates, mapLoaded]);

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
  }, [userCoordinates, mapLoaded]);

  // Geocode address to coordinates with optimized error handling
  const geocodeAddress = async (address: string, type: 'user' | 'provider', providerId?: number) => {
    if (type === 'user' && mapLoaded) return; // Prevent re-geocoding if map is already loaded

    setIsGeocoding(true);
    try {
      // Cache coordinates in localStorage to prevent redundant API calls
      const cacheKey = `geo_${address.replace(/\s+/g, '_').toLowerCase()}`;
      const cachedCoords = localStorage.getItem(cacheKey);

      if (cachedCoords) {
        const [lat, lon] = JSON.parse(cachedCoords);
        const coordinates: [number, number] = [parseFloat(lat), parseFloat(lon)];

        if (type === 'user') {
          setUserCoordinates(coordinates);
          if (mapRef.current) {
            mapRef.current.setView(coordinates, 13);
            // Only add user marker if it doesn't exist or coordinates have changed
            if (!userMarkerRef.current) {
              addUserMarker(coordinates);
            } else {
              // Update existing marker position if coordinates have changed
              userMarkerRef.current.setLatLng([coordinates[0], coordinates[1]]);
            }
          }
        } else if (type === 'provider' && providerId !== undefined) {
          setProviderCoordinates(prev => {
            const newMap = new Map(prev);
            newMap.set(providerId, coordinates);
            return newMap;
          });
        }
        setIsGeocoding(false);
        return;
      }

      try {
        // Try to clean up the address for better geocoding results
        const cleanAddress = address
          .replace(/\s+/g, ' ')  // Replace multiple spaces with a single space
          .trim();

        // Add Philippines to the address if it's not already there
        const addressWithCountry = cleanAddress.toLowerCase().includes('philippines')
          ? cleanAddress
          : `${cleanAddress}, Philippines`;

        // Ensure postal code is included for better geocoding results
        const addressWithPostal = addressWithCountry.includes('2100') ||
                                 addressWithCountry.includes('2105') ||
                                 addressWithCountry.includes('2108') ||
                                 addressWithCountry.includes('2110')
          ? addressWithCountry
          : addressWithCountry.replace('Philippines', '2100 Philippines');

        // Using Nominatim for geocoding (OSM's geocoding service)
        const encodedAddress = encodeURIComponent(addressWithPostal);
        // Add country code and viewbox parameters to improve geocoding accuracy
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&countrycodes=ph&viewbox=120.3,14.5,120.7,14.8&bounded=1&limit=1`);

        if (!response.ok) {
          throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const coordinates: [number, number] = [parseFloat(lat), parseFloat(lon)];

          // Cache the coordinates for future use
          localStorage.setItem(cacheKey, JSON.stringify([lat, lon]));

          if (type === 'user') {
            setUserCoordinates(coordinates);
            if (mapRef.current) {
              mapRef.current.setView(coordinates, 13);
              // Only add user marker if it doesn't exist or coordinates have changed
              if (!userMarkerRef.current) {
                addUserMarker(coordinates);
              } else {
                // Update existing marker position if coordinates have changed
                userMarkerRef.current.setLatLng([coordinates[0], coordinates[1]]);
              }
            }
          } else if (type === 'provider' && providerId !== undefined) {
            setProviderCoordinates(prev => {
              const newMap = new Map(prev);
              newMap.set(providerId, coordinates);
              return newMap;
            });
          }
        } else {
          // Try a fallback with just the city/province part of the address
          const parts = addressWithCountry.split(',');
          if (parts.length > 1) {
            // Take the last two parts (usually city and country)
            const simplifiedAddress = parts.slice(-2).join(',').trim();

            const encodedSimplifiedAddress = encodeURIComponent(simplifiedAddress);
            // Use the same improved parameters for fallback geocoding
            const fallbackResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedSimplifiedAddress}&countrycodes=ph&viewbox=120.3,14.5,120.7,14.8&bounded=1&limit=1`);
            const fallbackData = await fallbackResponse.json();

            if (fallbackData && fallbackData.length > 0) {
              const { lat, lon } = fallbackData[0];
              const coordinates: [number, number] = [parseFloat(lat), parseFloat(lon)];

              // Cache the coordinates for future use
              localStorage.setItem(cacheKey, JSON.stringify([lat, lon]));

              if (type === 'user') {
                setUserCoordinates(coordinates);
                if (mapRef.current) {
                  mapRef.current.setView(coordinates, 13);
                  if (!userMarkerRef.current) {
                    addUserMarker(coordinates);
                  } else {
                    userMarkerRef.current.setLatLng([coordinates[0], coordinates[1]]);
                  }
                }
              } else if (type === 'provider' && providerId !== undefined) {
                setProviderCoordinates(prev => {
                  const newMap = new Map(prev);
                  newMap.set(providerId, coordinates);
                  return newMap;
                });
              }
              return; // Successfully geocoded with simplified address
            }
          }

          // If we get here, both attempts failed
          if (type === 'user') {
            setGeocodeError("Could not find your location. Using default location.");
            // Use default Balanga City center coordinates
            const balangaCoordinates: [number, number] = [14.6742, 120.5434];
            setUserCoordinates(balangaCoordinates);
            if (mapRef.current) {
              addUserMarker(balangaCoordinates);
            }
          }
        }
      } catch (geocodeError) {
        if (type === 'user') {
          setGeocodeError("Could not find your location. Using default location.");
          // Use default Balanga City center coordinates
          const balangaCoordinates: [number, number] = [14.6742, 120.5434];
          setUserCoordinates(balangaCoordinates);
          if (mapRef.current) {
            addUserMarker(balangaCoordinates);
          }
        }
      }
    } catch (error) {
      if (type === 'user') {
        setGeocodeError("Error finding your location. Using default location.");
        // Use default Balanga City center coordinates
        const balangaCoordinates: [number, number] = [14.6742, 120.5434];
        setUserCoordinates(balangaCoordinates);
        if (mapRef.current) {
          addUserMarker(balangaCoordinates);
        }
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  // Initialize map with coordinates - optimized version
  const initializeMap = (coordinates: [number, number]) => {
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
              <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #2F7B5F; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; margin-right: 8px;">
                <img src="/logo.png" style="width: 28px; height: 28px; border-radius: 50%;" />
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

    } catch (error) {
      setGeocodeError("Error loading map. Please refresh the page.");
    }
  };

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
            batch.map(provider => geocodeAddress(provider.address, 'provider', provider.id))
          );

          // Add delay between batches to avoid rate limiting
          if (i + batchSize < serviceProviders.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      };

      geocodeProviders();
    }
  }, [userCoordinates, serviceProviders, providerCoordinates, mapLoaded]);

  // Update markers whenever provider coordinates change
  useEffect(() => {
    if (mapRef.current && providerCoordinates.size > 0) {
      addProviderMarkers();
    }
  }, [providerCoordinates]);

  // Handle selectedProviderId changes - trigger directions when selected from card
  useEffect(() => {
    if (selectedProviderId && mapRef.current && providerCoordinates.size > 0 && mapLoaded) {
      const coordinates = providerCoordinates.get(selectedProviderId);
      if (coordinates) {
        // Find the provider to get its name
        const provider = serviceProviders.find(p => p.id === selectedProviderId);
        if (provider) {
          setSelectedProviderName(provider.name);
          displayRouteToProvider(coordinates, provider.name);
        }
      }
    }
  }, [selectedProviderId, providerCoordinates, mapLoaded]);

  // Add user marker
  const addUserMarker = (coordinates: [number, number]) => {
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
  };

  // Function to add provider markers
  const addProviderMarkers = () => {
    if (!mapRef.current) return;

    // Clear existing provider markers
    providerMarkersRef.current.forEach(marker => {
      if (mapRef.current) marker.removeFrom(mapRef.current);
    });
    providerMarkersRef.current = [];

    // Add provider markers for geocoded providers
    serviceProviders.forEach(provider => {
      const coordinates = providerCoordinates.get(provider.id);
      if (!coordinates) return; // Skip if coordinates not yet available

      // Create provider icon with circular backdrop (Rainbow Paws logo) and name label above
      const providerIcon = L.divIcon({
        className: 'custom-provider-icon',
        html: `
          <div style="position: relative; width: 70px; height: 70px;">
            <div style="position: absolute; width: 70px; height: 70px; border-radius: 50%; background-color: #2F7B5F; box-shadow: 0 3px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
              <img src="/logo.png" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover;" />
            </div>
            <div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background-color: rgba(255,255,255,0.9); padding: 3px 8px; border-radius: 4px; white-space: nowrap; font-weight: bold; font-size: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); max-width: 150px; text-overflow: ellipsis; overflow: hidden;">${provider.name}</div>
          </div>
        `,
        iconSize: [70, 70],
        iconAnchor: [35, 35],
        popupAnchor: [0, -35]
      });

      // Create popup content with unique IDs for both buttons
      const popupContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; min-width: 200px;">
          <strong style="font-size: 1.1em; margin-bottom: 8px; display: block; color: #2F7B5F;">${provider.name}</strong>
          <span style="font-size: 0.9em; color: #555; display: block; margin-bottom: 12px;">${provider.address}</span>
          <div style="display: flex; justify-content: space-between; gap: 8px;">
            <button id="view-services-btn-${provider.id}" class="view-services-btn" style="background-color: #2F7B5F; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em; flex: 1; font-weight: bold;">View Services</button>
            <button id="route-button-${provider.id}" class="route-button" style="background-color: #555; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em; flex: 1; font-weight: bold;">Get Directions</button>
          </div>
        </div>
      `;

      // Add marker with lower zIndex to ensure user location stays on top
      const marker = L.marker([coordinates[0], coordinates[1]], {
        icon: providerIcon,
        zIndexOffset: 100 // Lower than user marker
      })
        .addTo(mapRef.current!)
        .bindPopup(popupContent, { maxWidth: 300 });

      // Add click handlers for both buttons when popup opens
      marker.on('popupopen', () => {
        setTimeout(() => {
          // Handle "Get Directions" button
          const routeButton = document.getElementById(`route-button-${provider.id}`);
          if (routeButton) {
            // Remove previous event listeners first to avoid duplicates
            const newRouteButton = routeButton.cloneNode(true);
            if (routeButton.parentNode) {
              routeButton.parentNode.replaceChild(newRouteButton, routeButton);
            }

            newRouteButton.addEventListener('click', () => {
              setSelectedProviderName(provider.name);
              displayRouteToProvider(coordinates, provider.name);
            });
          }

          // Handle "View Services" button
          const viewServicesButton = document.getElementById(`view-services-btn-${provider.id}`);
          if (viewServicesButton) {
            // Remove previous event listeners first to avoid duplicates
            const newViewServicesButton = viewServicesButton.cloneNode(true);
            if (viewServicesButton.parentNode) {
              viewServicesButton.parentNode.replaceChild(newViewServicesButton, viewServicesButton);
            }

            // Add click event listener to navigate to provider details page
            newViewServicesButton.addEventListener('click', () => {
              // Use window.location to navigate to the provider details page
              window.location.href = `/user/furparent_dashboard/services/${provider.id}`;
            });
          }
        }, 100);
      });

      // Store marker reference
      providerMarkersRef.current.push(marker);
    });
  };

  // Format distance in meters to a more human-readable format
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  };

  // Format duration in seconds to a more human-readable format with realistic travel time
  const formatDuration = (seconds: number, roadType: string = 'normal', distance: number = 0): string => {
    // Apply a moderate traffic factor based on road type
    let trafficFactor = 1.8; // Default factor - more balanced

    // Adjust traffic factor based on road type
    if (roadType.includes('motorway') || roadType.includes('trunk')) {
      trafficFactor = 1.5; // Highways are faster but still have traffic
    } else if (roadType.includes('residential') || roadType.includes('service')) {
      trafficFactor = 2.2; // Residential areas have stops and slower speeds
    } else if (roadType.includes('primary') || roadType.includes('secondary')) {
      trafficFactor = 1.8; // Main roads with traffic lights
    } else if (roadType.includes('tertiary') || roadType.includes('unclassified')) {
      trafficFactor = 2.0; // Smaller roads with turns
    }

    // Apply time-of-day factor based on current time - more moderate
    const hour = new Date().getHours();
    let timeOfDayFactor = 1.0;

    // Adjust for rush hours - more balanced
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
      timeOfDayFactor = 1.3; // Rush hour traffic
    } else if ((hour >= 10 && hour <= 15) || (hour >= 20 && hour <= 22)) {
      timeOfDayFactor = 1.1; // Mid-day and evening traffic
    } else {
      timeOfDayFactor = 1.0; // Early morning or late night
    }

    // Add time for traffic lights and intersections - more moderate
    const stepIntersections = Math.ceil(distance / 300); // One intersection every 300m
    const averageWaitTimePerIntersection = 15; // seconds - more realistic
    const intersectionTime = stepIntersections * averageWaitTimePerIntersection;

    // Calculate adjusted time based on actual driving conditions
    const adjustedSeconds = (seconds * trafficFactor * timeOfDayFactor) + intersectionTime;

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
  };

  // Function to display route on map using OSRM
  const displayRouteToProvider = (providerCoords: [number, number], providerName: string) => {
    if (!mapRef.current || !userCoordinates) return;

    // Clear existing route
    if (routeLayerRef.current && mapRef.current) {
      routeLayerRef.current.removeFrom(mapRef.current);
      routeLayerRef.current = null;
    }

    // Set loading state
    setRouteInstructions({ distance: "Calculating...", duration: "Calculating...", steps: [] });

    // Ensure we're using the current user marker position, not just the state
    const currentUserPosition = userMarkerRef.current?.getLatLng() || 
                               { lat: userCoordinates[0], lng: userCoordinates[1] };
    
    // Format coordinates correctly for OSRM API (longitude,latitude format)
    const startPoint = `${currentUserPosition.lng},${currentUserPosition.lat}`;
    const endPoint = `${providerCoords[1]},${providerCoords[0]}`;


    // Using OSRM demo server with instructions
    const osrmRequestUrl = `https://router.project-osrm.org/route/v1/driving/${startPoint};${endPoint}?overview=full&geometries=geojson&steps=true&annotations=true`;

    fetch(osrmRequestUrl)
      .then(response => response.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const routeGeometry = route.geometry.coordinates;
          const latLngs = routeGeometry.map((coord: [number, number]) => [coord[1], coord[0]]); // OSRM is lng,lat; Leaflet is lat,lng

          // Create route with gradient color from green to red
          routeLayerRef.current = L.polyline(latLngs, {
            color: '#2F7B5F',
            weight: 5,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(mapRef.current!);

          mapRef.current!.fitBounds(routeLayerRef.current.getBounds().pad(0.1)); // Zoom to fit the route with padding

          // Parse and format route instructions
          if (route.legs && route.legs.length > 0) {
            const leg = route.legs[0];
            const totalDistance = formatDistance(leg.distance);

            // Determine predominant road type for the entire route
            let primaryRoadType = 'normal';

            // Calculate simplified and realistic travel duration
            const totalDuration = formatDuration(leg.duration, primaryRoadType, leg.distance);

            const steps = leg.steps.map((step: {
              maneuver: { instruction?: string };
              name?: string;
              distance: number;
              duration: number;
            }) => {
              // Determine road type for this step
              const roadType = step.name?.includes('motorway') ? 'motorway' :
                               step.name?.includes('trunk') ? 'trunk' :
                               step.name?.includes('primary') ? 'primary' :
                               step.name?.includes('secondary') ? 'secondary' :
                               step.name?.includes('residential') ? 'residential' : 'normal';

              return {
                instruction: step.maneuver.instruction || step.name || 'Continue straight',
                distance: formatDistance(step.distance),
                duration: formatDuration(step.duration, roadType, step.distance)
              };
            })
            // Filter out steps with empty instructions or very small distances
            .filter((step: {
              instruction: string;
              distance: string;
              duration: string;
            }) => {
              // Check that instruction is valid
              if (!step.instruction ||
                  step.instruction.trim() === '' ||
                  step.instruction.includes('undefined')) {
                return false;
              }

              // Parse distance value correctly
              let distanceValue = 0;
              if (step.distance.includes('km')) {
                distanceValue = parseFloat(step.distance) * 1000; // Convert km to meters
              } else {
                distanceValue = parseFloat(step.distance.replace(' m', '')); // Remove ' m' and parse
              }

              // Skip very small distances (less than 5 meters)
              return distanceValue > 5;
            });

            setRouteInstructions({
              distance: totalDistance,
              duration: totalDuration,
              steps
            });
          }
        } else {
          alert(`Could not find a route to ${providerName}.`);
          setRouteInstructions(null);
        }
      })
      .catch(error => {
        alert(`Error fetching route to ${providerName}. Please try again.`);
        setRouteInstructions(null);
      });
  };

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

      // Clear route instructions
      setRouteInstructions(null);

      // Remove map
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div id="map-container" ref={mapContainerRef} className="w-full h-full rounded-lg overflow-hidden shadow-inner">
        {/* Map will be rendered here */}
      </div>

      {/* Map lock indicator */}
      <div
        className={`absolute top-4 left-12 bg-white px-3 py-1.5 rounded shadow-md z-[1000] text-sm transition-opacity duration-300 ${isMapLocked ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-gray-700">Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded-sm mx-0.5 text-xs font-mono">Ctrl</kbd> to interact with map</span>
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
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px 15px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {geocodeError}
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
          Finding locations...
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

      {/* Route instructions panel */}
      {routeInstructions && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs max-h-[60%] overflow-y-auto z-[1000] border-l-4 border-[#2F7B5F]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[#2F7B5F] font-bold text-sm">Directions to {selectedProviderName}</h3>
            <button
              className="text-gray-600 hover:text-gray-800"
              onClick={() => setRouteInstructions(null)}
              aria-label="Close directions"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
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