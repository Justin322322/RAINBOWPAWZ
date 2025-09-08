'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodingService } from '@/utils/geocoding';

interface StaticMapComponentProps {
  providerAddress: string;
  providerName: string;
  className?: string;
}

export default function StaticMapComponent({
  providerAddress,
  providerName,
  className = "w-full h-64"
}: StaticMapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return;

    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Geocode the provider address
        const result = await geocodingService.geocodeAddress(providerAddress);
        
        if (!result.coordinates) {
          throw new Error('Could not find provider location');
        }

        // Create map container
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.borderRadius = '8px';
        
        if (mapContainerRef.current) {
          mapContainerRef.current.appendChild(container);
        }

        // Initialize map
        mapRef.current = L.map(container, {
          center: result.coordinates,
          zoom: 15,
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: false,
          dragging: false,
          touchZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false
        });

        // Set a lower z-index to prevent overriding navigation
        const mapContainer = mapRef.current.getContainer();
        if (mapContainer) {
          mapContainer.style.zIndex = '1';
        }

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmu.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          minZoom: 10
        }).addTo(mapRef.current);

        // Add provider marker with Pawrest branding
        const customIcon = L.divIcon({
          className: 'custom-provider-marker-static',
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
          iconAnchor: [20, 20]
        });

        L.marker(result.coordinates, {
          icon: customIcon
        }).addTo(mapRef.current);

        // Add static info overlay
        const infoOverlay = L.Control.extend({
          onAdd: function() {
            const div = L.DomUtil.create('div', 'info-overlay-static');
            div.innerHTML = `
              <div style="
                background: rgba(255, 255, 255, 0.95);
                padding: 8px 12px;
                border-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                font-family: Arial, sans-serif;
                font-size: 12px;
                color: #2F7B5F;
                font-weight: 600;
                border-left: 3px solid #2F7B5F;
              ">
                ${providerName}
              </div>
            `;
            return div;
          }
        });
        new infoOverlay({ position: 'bottomleft' }).addTo(mapRef.current);

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize static map:', err);
        setError('Location not available');
        setIsLoading(false);
      }
    };

    initializeMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [providerAddress, providerName]);

  if (error) {
    return (
      <div className={`${className} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <div className="text-center text-gray-500">
          <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-lg overflow-hidden relative"
      >
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 border-2 border-[#2F7B5F] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600">Loading mu...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
