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
            styles: [
              {
                featureType: "poi.medical",
                elementType: "geometry",
                stylers: [{ visibility: "on" }, { color: "#e5f3ff" }],
              },
              {
                featureType: "poi.medical",
                elementType: "labels.icon",
                stylers: [{ visibility: "on" }, { hue: "#0066cc" }],
              },
            ],
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
        const isTopOne = result === searchResults[0]; // The #1 result
        const isTopTwo = result === searchResults[1]; // The #2 result

        // Determine rank for label
        let rank = "";
        if (isTopOne) rank = "1";
        else if (isTopTwo) rank = "2";
        else if (isTopThree) rank = "3";

        const marker = new window.google.maps.Marker({
          position: { lat: result.location.lat, lng: result.location.lng },
          map: googleMapRef.current,
          title: result.name,
          animation: isTopThree ? window.google.maps.Animation.DROP : null,
          icon: isTopThree
            ? {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: isTopOne
                  ? "#00cc66"
                  : isTopTwo
                  ? "#0080ff"
                  : "#0066cc",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
                scale: isTopOne ? 14 : isTopTwo ? 12 : 10,
                labelOrigin: new window.google.maps.Point(0, 0),
              }
            : null,
          label: isTopThree
            ? {
                text: rank,
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "bold",
              }
            : null,
          zIndex: isTopOne ? 1000 : isTopTwo ? 999 : isTopThree ? 998 : 1,
        }) as CustomMarker;

        // Create an info window with more details for top 3
        if (isTopThree) {
          // Create stars for rating display
          let starsHtml = "";
          if (result.rating) {
            const fullStars = Math.floor(result.rating);
            const halfStar = result.rating % 1 >= 0.5;
            const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

            starsHtml = "★".repeat(fullStars);
            if (halfStar) starsHtml += "½";
            starsHtml += "☆".repeat(emptyStars);
          }

          const content = `
            <div class="map-info-window">
              ${
                isTopThree
                  ? `
                <div class="map-info-rank rank-${rank}">
                  <span class="rank-number">#${rank}</span>
                  <span class="rank-label">${
                    isTopOne
                      ? "Top Rated GP"
                      : isTopTwo
                      ? "Highest Rated"
                      : "Highest Rated"
                  }</span>
                </div>
              `
                  : ""
              }
              <h3>${result.name}</h3>
              ${
                result.rating
                  ? `<div class="info-rating">
                      <span class="rating-stars">
                        ${"★".repeat(Math.floor(result.rating))}${
                      result.rating % 1 >= 0.5 ? "½" : ""
                    }${"☆".repeat(5 - Math.ceil(result.rating))}
                      </span>
                      <span class="rating-value">${result.rating.toFixed(
                        1
                      )}</span>
                      <span class="review-count">(${
                        result.user_ratings_total
                      } reviews)</span>
                    </div>`
                  : ""
              }
              <p>📍&nbsp;${result.vicinity}</p>
              
${
  result.phone_number
    ? `
  <div class="info-detail">
    <strong>📞&nbsp;</strong> 
    <a href="tel:${result.phone_number}">${result.phone_number}</a>
  </div>
`
    : ""
}

${
  result.website
    ? `
  <div class="info-detail">
    <strong>🌐&nbsp;</strong> 
    <a href="${result.website}" target="_blank">${result.website
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "")}</a>
  </div>
`
    : ""
}
              
              <div class="action-links">
                <a href="https://www.google.com/maps/place/?q=place_id:${
                  result.place_id
                }" target="_blank">View on Google Maps</a>
              </div>
            </div>
          `;

          const infoWindow = new window.google.maps.InfoWindow({
            content: content,
            maxWidth: 300,
          });

          // Show info window for top result by default
          if (isTopOne) {
            infoWindow.open(googleMapRef.current, marker);
          }

          // Add click event to marker
          marker.addListener("click", () => {
            try {
              // Close all open info windows first
              markersRef.current.forEach((m) => {
                if (m.infoWindow) m.infoWindow.close();

                // Reset all animations
                m.setAnimation(null);
              });

              // Animate this marker when clicked
              if (!isTopOne) {
                // Don't animate #1 since it's already distinct
                marker.setAnimation(window.google.maps.Animation.BOUNCE);
                setTimeout(() => {
                  marker.setAnimation(null);
                }, 750); // Short bounce
              }

              infoWindow.open(googleMapRef.current, marker);
              dispatch({ type: "SELECT_RESULT", payload: result });
            } catch (error) {
              console.error("Error handling marker click:", error);
            }
          });

          // Store info window with marker
          marker.infoWindow = infoWindow;
        } else {
          // Create info window for regular markers
          const content = `
    <div class="map-info-window">
      <h3>${result.name}</h3>
      ${
        result.rating
          ? `<div class="info-rating">
              <span class="rating-stars">
                ${"★".repeat(Math.floor(result.rating))}${
              result.rating % 1 >= 0.5 ? "½" : ""
            }${"☆".repeat(5 - Math.ceil(result.rating))}
              </span>
              <span class="rating-value">${result.rating.toFixed(1)}</span>
              <span class="review-count">(${
                result.user_ratings_total
              } reviews)</span>
            </div>`
          : `<div class="no-rating">No ratings yet</div>`
      }
      <p>📍&nbsp;${result.vicinity}</p>

      
${
  result.phone_number
    ? `
  <div class="info-detail">
    <strong>📞&nbsp;</strong> 
    <a href="tel:${result.phone_number}">${result.phone_number}</a>
  </div>
`
    : ""
}

${
  result.website
    ? `
  <div class="info-detail">
    <strong>🌐&nbsp;</strong> 
    <a href="${result.website}" target="_blank">${result.website
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "")}</a>
  </div>
`
    : ""
}

${
  result.opening_hours && result.opening_hours.weekday_text
    ? `
  <div class="info-detail hours-preview">
    <strong>Hours:</strong> 
    <span class="today-hours">${getTodayHours(result.opening_hours)}</span>
  </div>
`
    : ""
}     
      <div class="action-links">
        <a href="https://www.google.com/maps/place/?q=place_id:${
          result.place_id
        }" target="_blank">View on Google Maps</a>
      </div>
    </div>
          
      <div class="info-rank">Rank: #${searchResults.indexOf(result) + 1} of ${
            searchResults.length
          }</div>
  `;

          const infoWindow = new window.google.maps.InfoWindow({
            content: content,
            maxWidth: 300,
          });

          // Add click event to marker
          marker.addListener("click", () => {
            // Close all open info windows first
            markersRef.current.forEach((m) => {
              if (m.infoWindow) m.infoWindow.close();

              // Reset all animations
              m.setAnimation(null);
            });

            // Brief bounce animation for this marker
            marker.setAnimation(window.google.maps.Animation.BOUNCE);
            setTimeout(() => {
              marker.setAnimation(null);
            }, 750);

            infoWindow.open(googleMapRef.current, marker);
            dispatch({ type: "SELECT_RESULT", payload: result });
          });

          // Store info window with marker
          marker.infoWindow = infoWindow;
        }

        // Add to bounds
        const position = marker.getPosition();
        if (position) {
          bounds.extend(position);
        }

        // Save reference to marker
        markersRef.current.push(marker);
      });

      // Fit bounds to show all markers
      if (markersRef.current.length > 1) {
        googleMapRef.current.fitBounds(bounds);

        // Add a slight zoom out to provide context
        googleMapRef.current.addListener("bounds_changed", function () {
          const zoom = googleMapRef.current?.getZoom();
          if (zoom && zoom > 16) {
            googleMapRef.current?.setZoom(16);
          }
        });
      }
    }
  }, [searchResults, dispatch]);

  // Highlight selected result on map
  useEffect(() => {
    if (!googleMapRef.current || !selectedResult) return;

    // Find the marker for the selected result
    const marker = markersRef.current.find((m) => {
      const position = m.getPosition();
      return (
        position &&
        position.lat() === selectedResult.location.lat &&
        position.lng() === selectedResult.location.lng
      );
    });

    if (marker) {
      // Center the map on the selected result
      googleMapRef.current.panTo({
        lat: selectedResult.location.lat,
        lng: selectedResult.location.lng,
      });

      // Zoom in a bit, but not too much
      googleMapRef.current.setZoom(15);

      // Open info window if it exists
      if (marker.infoWindow) {
        // Close all other info windows first
        markersRef.current.forEach((m) => {
          if (m.infoWindow && m !== marker) {
            m.infoWindow.close();
          }
        });

        marker.infoWindow.open(googleMapRef.current, marker);
      }

      // Animate the marker briefly
      if (!selectedResult.isTopThree) {
        marker.setAnimation(window.google.maps.Animation.BOUNCE);
        setTimeout(() => {
          marker.setAnimation(null);
        }, 750);
      }
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

  // Helper function to get today's hours
  const getTodayHours = (hours: any): string => {
    if (!hours || !hours.weekday_text) {
      return "Hours not available";
    }

    try {
      // Use isOpen function if available
      if (typeof hours.isOpen === "function") {
        return hours.isOpen() ? "Open now" : "Closed now";
      }

      // Otherwise extract from weekday_text
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const today = days[new Date().getDay()];
      const todayHours = hours.weekday_text.find((text: string) =>
        text.startsWith(today)
      );

      return todayHours ? todayHours.split(": ")[1] : "Hours not available";
    } catch (e) {
      return "Hours not available";
    }
  };

  return (
    <div className="map map-container">
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
