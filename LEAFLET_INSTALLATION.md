# OpenStreetMap with Leaflet Integration

This project uses OpenStreetMap with Leaflet.js to provide an interactive map with routing functionality, similar to Google Maps but using an open-source alternative.

## Required Packages

To fully implement the interactive map functionality, you need to install the following packages:

```bash
npm install leaflet react-leaflet leaflet-routing-machine
```

## What's Included

1. **OpenStreetMap Integration**: Free, open-source map data
2. **Routing Functionality**: Calculate and display routes between locations
3. **Custom Markers**: Show your location and service provider locations
4. **Interactive Popups**: Display information about service providers
5. **Route Display**: Show driving directions between your location and service providers

## How It Works

The implementation uses:

1. **Leaflet.js**: A leading open-source JavaScript library for mobile-friendly interactive maps
2. **React-Leaflet**: React components for Leaflet maps
3. **Leaflet Routing Machine**: A Leaflet plugin for route calculation and display

## File Structure

- `src/components/map/MapComponent.tsx`: Main map component wrapper
- `src/components/map/MapComponentClient.tsx`: Client-side implementation of the map
- `src/app/leaflet.css`: Custom CSS for the map components

## Usage

The map component is used in the services page to:

1. Display your current location
2. Show nearby pet cremation service providers
3. Calculate and display routes to selected providers
4. Show distance and estimated travel time

## Customization

You can customize the map by:

1. Changing the map style by using different tile providers
2. Customizing the route line colors and styles
3. Adding additional map features like geolocation
4. Implementing search functionality for locations

## Resources

- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [React Leaflet Documentation](https://react-leaflet.js.org/)
- [Leaflet Routing Machine Documentation](https://www.liedman.net/leaflet-routing-machine/)
- [OpenStreetMap](https://www.openstreetmap.org/)
