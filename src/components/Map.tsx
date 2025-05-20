import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsApi } from "../utilities/loadGoogleMap";
import { useMapContext } from "../context/MapContext";

// Declare the google namespace to avoid TypeScript errors
declare global {
  interface Window {
    google: typeof google;
  }

  namespace google.maps {
    interface Marker {
      infoWindow?: google.maps.InfoWindow;
    }
  }
}
// Define a custom marker type for better TypeScript support
interface CustomMarker extends google.maps.Marker {
  infoWindow?: google.maps.InfoWindow;
}

const Map = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const markersRef = useRef<CustomMarker[]>([]);

  // Use the context
  const { state, dispatch } = useMapContext();
  const { searchLocation, searchResults, selectedResult } = state;

  // Initialize the map
  useEffect(() => {
    const initMap = async () => {
      try {
        await loadGoogleMapsApi();

        // Add a small delay to ensure the API is fully initialized
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (!window.google || !window.google.maps) {
          setMapError("Google Maps failed to load correctly");
          return;
        }

        if (mapRef.current && !googleMapRef.current) {
          // Make sure window.google.maps.Map is accessible
          const MapConstructor = window.google.maps.Map;
          if (typeof MapConstructor !== "function") {
            setMapError("Google Maps API loaded incorrectly");
            return;
          }

          // Initialize map with default location
          googleMapRef.current = new MapConstructor(mapRef.current, {
            center: { lat: 51.5074, lng: -0.1278 }, // Default to London
            zoom: 10,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
          });
        }
      } catch (error) {
        console.error("Error initializing Google Maps:", error);
        const errorMessage =
          error && typeof error === "object" && "message" in error
            ? (error as { message: string }).message
            : "Unknown error";
        setMapError(`Failed to initialize Google Maps: ${errorMessage}`);
      }
    };

    initMap();
  }, []);

  // Update map when search location changes
  useEffect(() => {
    if (!googleMapRef.current || !searchLocation) return;

    const { lat, lng } = searchLocation;
    googleMapRef.current.setCenter({ lat, lng });
    googleMapRef.current.setZoom(13);
  }, [searchLocation]);

  // Update markers when search results change
  // In your Map component, update the useEffect for handling search results

  // Update markers when search results change
  useEffect(() => {
    if (!googleMapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Add markers for new results
    if (searchResults.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();

      searchResults.forEach((result) => {
        // Create custom marker - highlighted for top 3
        const isTopThree = result.isTopThree;

        const marker = new window.google.maps.Marker({
          position: { lat: result.location.lat, lng: result.location.lng },
          map: googleMapRef.current,
          title: result.name,
          animation: isTopThree ? window.google.maps.Animation.DROP : null,
          icon: isTopThree
            ? {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: "#0066cc",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
                scale: 10,
              }
            : null,
        });

        // Create an info window with more details for top 3
        if (isTopThree) {
          const content = `
          <div class="map-info-window">
            <h3>${result.name}</h3>
            <p>${result.vicinity}</p>
            ${
              result.rating
                ? `<p>Rating: ${result.rating} (${result.user_ratings_total} reviews)</p>`
                : ""
            }
            <p><strong>TOP RATED GP</strong></p>
          </div>
        `;

          const infoWindow = new window.google.maps.InfoWindow({
            content: content,
          });

          // Show info window for top result by default
          if (result === searchResults[0]) {
            infoWindow.open(googleMapRef.current, marker);
          }

          // Add click event to marker
          marker.addListener("click", () => {
            // Close all open info windows first
            markersRef.current.forEach((m) => {
              if (m.infoWindow) m.infoWindow.close();
            });

            infoWindow.open(googleMapRef.current, marker);
            dispatch({ type: "SELECT_RESULT", payload: result });
          });

          // Store info window with marker
          marker.infoWindow = infoWindow;
        } else {
          // Add click event to regular markers
          marker.addListener("click", () => {
            dispatch({ type: "SELECT_RESULT", payload: result });
          });
        }

        // Add to bounds
        bounds.extend(marker.getPosition() as google.maps.LatLng);

        // Save reference to marker
        markersRef.current.push(marker);
      });

      // Fit bounds to show all markers
      if (markersRef.current.length > 1) {
        googleMapRef.current.fitBounds(bounds);
      }
    }
  }, [searchResults, dispatch]);
  // Highlight selected result on map
  useEffect(() => {
    if (!googleMapRef.current || !selectedResult) return;

    // Center the map on the selected result
    googleMapRef.current.panTo({
      lat: selectedResult.location.lat,
      lng: selectedResult.location.lng,
    });

    // Zoom in a bit
    googleMapRef.current.setZoom(15);

    // Highlight the marker (you could create a special marker here)
    const marker = markersRef.current.find(
      (m) =>
        m.getPosition()?.lat() === selectedResult.location.lat &&
        m.getPosition()?.lng() === selectedResult.location.lng
    );

    if (marker) {
      // Animate the marker
      marker.setAnimation(window.google.maps.Animation.BOUNCE);
      setTimeout(() => {
        marker.setAnimation(null);
      }, 2000);
    }
  }, [selectedResult]);

  if (mapError) {
    return (
      <div className="map-error">
        <p>{mapError}</p>
        <p>Please check your API key and internet connection.</p>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div ref={mapRef} className="map"></div>
      {searchResults.length === 0 && !searchLocation && (
        <div className="map-overlay">
          <p>Search for a location to find GP practices nearby</p>
        </div>
      )}
    </div>
  );
};

export default Map;
