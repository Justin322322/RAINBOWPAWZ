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

// Define the provider interface
interface Provider {
  id: number;
  user_id: number;
  cremation_centers_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  business_description: string;
  city: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface LocationMapProps {
  userAddress?: string; // Made optional since we're using hardcoded coordinates
  providers: Provider[];
  isLoading: boolean;
}

export default function LocationMap({ userAddress, providers, isLoading }: LocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const providerMarkersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create map if it doesn't exist
    if (!mapRef.current) {
      // Default view is Balanga City, Bataan
      mapRef.current = L.map('map-container').setView([14.6794, 120.5446], 11);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapRef.current);

      // Add legend
      const legend = new L.Control({ position: 'bottomright' });
      legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = `
          <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 1px 5px rgba(0,0,0,0.2);">
            <div style="margin-bottom: 8px;"><b>Map Legend</b></div>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
              <div style="width: 20px; height: 20px; background-color: #4CAF50; border-radius: 50%; margin-right: 5px;"></div>
              <span>Your Location <b>(This is you)</b></span>
            </div>
            <div style="display: flex; align-items: center;">
              <div style="width: 20px; height: 20px; background-color: #F44336; border-radius: 50%; margin-right: 5px;"></div>
              <span>Pet Cremation Center</span>
            </div>
          </div>
        `;
        return div;
      };
      legend.addTo(mapRef.current);
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Effect to update user location when userAddress changes
  useEffect(() => {
    if (userAddress && !isLoading) {
      getUserLocation();
    }
  }, [userAddress, isLoading]);

  // Update markers when providers change
  useEffect(() => {
    if (!mapRef.current || isLoading) return;

    // Clear existing provider markers
    providerMarkersRef.current.forEach(marker => {
      if (mapRef.current) marker.removeFrom(mapRef.current);
    });
    providerMarkersRef.current = [];

    // Add provider markers
    providers.forEach(provider => {
      geocodeAddress(provider.business_address, provider);
    });
  }, [providers, isLoading]);

  // Function to get user's location using Nominatim geocoding
  const getUserLocation = () => {
    if (!userAddress || userAddress.trim() === '') return;

    // Use Nominatim for accurate geocoding
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(userAddress)}&limit=1&addressdetails=1`;

    // Add a loading indicator
    if (mapRef.current) {
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'map-loading';
      loadingDiv.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.2); z-index: 1000;">Searching location...</div>';
      mapRef.current.getContainer().appendChild(loadingDiv);
    }

    fetch(geocodeUrl)
      .then(response => response.json())
      .then(data => {
        // Remove loading indicator
        const loadingDiv = document.getElementById('map-loading');
        if (loadingDiv) loadingDiv.remove();

        if (data && data.length > 0) {
          console.log('Geocoding result:', data[0]);

          const coordinates = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };

          setUserCoordinates(coordinates);
          updateUserMarker(coordinates);

          // Center and zoom the map to the found location
          if (mapRef.current) {
            mapRef.current.setView([coordinates.lat, coordinates.lng], 13);
          }
        } else {
          console.error('No results found for address:', userAddress);
          // Fallback to default coordinates
          const coordinates = {
            lat: 14.6794, // Balanga City, Bataan
            lng: 120.5446
          };
          setUserCoordinates(coordinates);
          updateUserMarker(coordinates);
        }
      })
      .catch(error => {
        console.error('Error geocoding address:', error);
        // Remove loading indicator
        const loadingDiv = document.getElementById('map-loading');
        if (loadingDiv) loadingDiv.remove();

        // Fallback to default coordinates
        const coordinates = {
          lat: 14.6794,
          lng: 120.5446
        };
        setUserCoordinates(coordinates);
        updateUserMarker(coordinates);
      });
  };

  // Function to update the user marker
  const updateUserMarker = (coordinates: { lat: number; lng: number }) => {
    if (!mapRef.current) return;

    // Create user icon (green circle with person icon)
    const userIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="background-color: #4CAF50; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="14" height="14">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    // Remove existing marker if it exists
    if (userMarkerRef.current) {
      userMarkerRef.current.removeFrom(mapRef.current);
    }

    // Add new marker
    userMarkerRef.current = L.marker([coordinates.lat, coordinates.lng], { icon: userIcon })
      .addTo(mapRef.current)
      .bindTooltip("This is you", { permanent: true, direction: 'top', offset: [0, -10] })
      .openTooltip();

    // Center map on user location
    mapRef.current.setView([coordinates.lat, coordinates.lng], 11);
  };

  // Function to geocode provider addresses using Nominatim
  const geocodeAddress = (address: string, provider: Provider) => {
    if (!mapRef.current) return;

    // If provider has location coordinates, use them directly
    if (provider.location && provider.location.lat && provider.location.lng) {
      addProviderMarker(provider.location, provider);
      return;
    }

    // Make sure we have a valid address
    if (!address || address.trim() === '') {
      console.error('Empty address for provider:', provider);
      return;
    }

    // Add "Bataan, Philippines" to the address if it doesn't already include it
    // This helps Nominatim find the correct location
    let searchAddress = address;
    if (!searchAddress.toLowerCase().includes('bataan')) {
      searchAddress += ', Bataan';
    }
    if (!searchAddress.toLowerCase().includes('philippines')) {
      searchAddress += ', Philippines';
    }

    // Use Nominatim for accurate geocoding with a slight delay to avoid rate limiting
    setTimeout(() => {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&addressdetails=1`;

      fetch(geocodeUrl)
        .then(response => response.json())
        .then(data => {
          if (data && data.length > 0) {
            console.log(`Geocoding result for ${provider.cremation_centers_name}:`, data[0]);

            const coordinates = {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            };

            // Store the coordinates for future use
            provider.location = coordinates;

            addProviderMarker(coordinates, provider);
          } else {
            console.error('No results found for address:', searchAddress);
            // Fallback to known coordinates based on location names
            let fallbackCoordinates;

            if (address.toLowerCase().includes('capitol drive') || address.toLowerCase().includes('balanga city')) {
              fallbackCoordinates = { lat: 14.6785, lng: 120.5452 };
            } else if (address.toLowerCase().includes('tuyo')) {
              fallbackCoordinates = { lat: 14.6915, lng: 120.5321 };
            } else if (address.toLowerCase().includes('tenejero')) {
              fallbackCoordinates = { lat: 14.6642, lng: 120.5412 };
            } else if (address.toLowerCase().includes('orion')) {
              fallbackCoordinates = { lat: 14.6204, lng: 120.5788 };
            } else if (address.toLowerCase().includes('mariveles')) {
              fallbackCoordinates = { lat: 14.4359, lng: 120.4904 };
            } else if (address.toLowerCase().includes('dinalupihan')) {
              fallbackCoordinates = { lat: 14.8775, lng: 120.4591 };
            } else {
              // Default to a location near Capitol Building for any unknown address
              fallbackCoordinates = {
                lat: 14.6785 + (Math.random() * 0.01 - 0.005),
                lng: 120.5452 + (Math.random() * 0.01 - 0.005)
              };
            }

            // Store the fallback coordinates for future use
            provider.location = fallbackCoordinates;

            addProviderMarker(fallbackCoordinates, provider);
          }
        })
        .catch(error => {
          console.error('Error geocoding address:', error);
          // Fallback to a location near Capitol Building
          const fallbackCoordinates = {
            lat: 14.6785 + (Math.random() * 0.01 - 0.005),
            lng: 120.5452 + (Math.random() * 0.01 - 0.005)
          };

          // Store the fallback coordinates for future use
          provider.location = fallbackCoordinates;

          addProviderMarker(fallbackCoordinates, provider);
        });
    }, Math.random() * 1000); // Random delay between 0-1000ms to avoid rate limiting
  };

  // Function to add a provider marker
  const addProviderMarker = (coordinates: { lat: number; lng: number }, provider: Provider) => {
    if (!mapRef.current) return;

    // Create provider icon (red circle with building icon)
    const providerIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="background-color: #F44336; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="14" height="14">
            <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
          </svg>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    // Create popup content
    const popupContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <strong style="font-size: 1.1em; margin-bottom: 5px; display: block;">${provider.cremation_centers_name}</strong>
        <span style="font-size: 0.9em; color: #555; display: block; margin-bottom: 10px;">${provider.business_address}</span>
        <button class="view-services-btn" style="background-color: #2F7B5F; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em; margin-right: 5px;">View Services</button>
        <button class="route-button" data-provider-id="${provider.user_id}" style="background-color: #555; color: white; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Show Route</button>
      </div>
    `;

    // Add marker
    const marker = L.marker([coordinates.lat, coordinates.lng], { icon: providerIcon })
      .addTo(mapRef.current)
      .bindPopup(popupContent);

    // Add click handler for the route button
    marker.on('popupopen', () => {
      setTimeout(() => {
        const routeButton = document.querySelector('.route-button');
        if (routeButton) {
          routeButton.addEventListener('click', () => {
            if (userCoordinates) {
              displayRouteToProvider(coordinates, provider.cremation_centers_name);
            }
          });
        }
      }, 100);
    });

    // Store marker reference
    providerMarkersRef.current.push(marker);
  };

  // Function to display route on map using OSRM
  const displayRouteToProvider = (providerCoords: { lat: number; lng: number }, providerName: string) => {
    if (!mapRef.current || !userCoordinates) {
      alert("Your location is not available yet. Please wait or refresh your location.");
      return;
    }

    // Clear existing route
    if (routeLayerRef.current) {
      routeLayerRef.current.removeFrom(mapRef.current);
      routeLayerRef.current = null;
    }

    const startPoint = `${userCoordinates.lng},${userCoordinates.lat}`;
    const endPoint = `${providerCoords.lng},${providerCoords.lat}`;
    // Using OSRM demo server. For production, consider a dedicated instance or a commercial service.
    const osrmRequestUrl = `https://router.project-osrm.org/route/v1/driving/${startPoint};${endPoint}?overview=full&geometries=geojson`;

    fetch(osrmRequestUrl)
      .then(response => response.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          const routeGeometry = data.routes[0].geometry.coordinates;
          const latLngs = routeGeometry.map((coord: [number, number]) => [coord[1], coord[0]]); // OSRM is lng,lat; Leaflet is lat,lng

          routeLayerRef.current = L.polyline(latLngs, { color: '#2F7B5F', weight: 5 }).addTo(mapRef.current!);
          mapRef.current!.fitBounds(routeLayerRef.current.getBounds().pad(0.1)); // Zoom to fit the route with padding
        } else {
          alert(`Could not find a route to ${providerName}.`);
          console.error("OSRM routing error: No routes found", data);
        }
      })
      .catch(error => {
        alert(`Error fetching route to ${providerName}. Please try again.`);
        console.error('OSRM API error:', error);
      });
  };

  return (
    <div id="map-container" className="w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
          <div className="text-[var(--primary-green)] text-xl">Loading map...</div>
        </div>
      )}
    </div>
  );
}
