import React, { useState, useEffect, useRef } from "react";
import { loadGoogleMapsApi } from "../utilities/loadGoogleMap";
import { useMapContext } from "../context/MapContext";

const Search = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const autocompleteWrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  // Location states
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [locationPermissionState, setLocationPermissionState] = useState<
    "unknown" | "granted" | "denied" | "prompt"
  >("unknown");

  // Use the context
  const { dispatch } = useMapContext();

  // Check location permission on load
  useEffect(() => {
    // Check if we've already prompted the user before
    const hasPromptedBefore =
      localStorage.getItem("locationPrompted") === "true";

    if (!hasPromptedBefore) {
      // Wait a moment after page load before showing the modal
      const timer = setTimeout(() => {
        setShowLocationModal(true);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      // If they've previously granted permission, try to use location
      const hasGranted =
        localStorage.getItem("locationPermission") === "granted";
      if (hasGranted) {
        checkPermissionAndLocate();
      }
    }
  }, []);

  // Load Google Maps API
  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        await loadGoogleMapsApi();

        if (
          !window.google ||
          !window.google.maps ||
          !window.google.maps.places
        ) {
          console.error("Google Maps API not loaded correctly");
          setError("Google Maps API failed to load properly");
          return;
        }

        // Initialize autocomplete
        if (inputRef.current) {
          console.log("Initializing autocomplete");
          const autocomplete = new window.google.maps.places.Autocomplete(
            inputRef.current,
            {
              types: ["geocode"],
              fields: ["geometry", "formatted_address", "name", "place_id"],
            }
          );

          autocompleteRef.current = autocomplete;

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            console.log("Place selected:", place);
            handlePlaceSelect(place);
          });
        }
      } catch (error) {
        console.error("Error initializing Places Autocomplete:", error);
        setError("Failed to load location search. Please try again later.");
      }
    };

    initAutocomplete();
  }, []);

  // Check permission and get location
  const checkPermissionAndLocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    // Check if we can query permission state
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((permissionStatus) => {
          setLocationPermissionState(permissionStatus.state);

          if (permissionStatus.state === "granted") {
            getUserLocation();
          } else if (permissionStatus.state === "prompt") {
            // Wait for user interaction
          } else {
            // Permission denied
            setError(
              "Location access denied. Please enable location services."
            );
          }
        });
    } else {
      // If we can't query permission, just try to get location
      getUserLocation();
    }
  };

  // Get user's location
  const getUserLocation = () => {
    setIsSearching(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Save permission state
        localStorage.setItem("locationPermission", "granted");
        localStorage.setItem("locationPrompted", "true");

        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Use reverse geocoding to get address
        const geocoder = new window.google.maps.Geocoder();
        const latlng = { lat: latitude, lng: longitude };

        geocoder.geocode({ location: latlng }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            // Create location object
            const location = {
              lat: latitude,
              lng: longitude,
              address: results[0].formatted_address || "Your location",
            };

            console.log("User's current location:", location);

            // Update input field with the address
            setSearchQuery(location.address);

            // Update context
            dispatch({ type: "SET_SEARCH_LOCATION", payload: location });

            // Search for GPs near user's location
            searchForGPs(location);
          } else {
            // Use coordinates even without an address
            const location = {
              lat: latitude,
              lng: longitude,
              address: "Your location",
            };

            // Update context
            dispatch({ type: "SET_SEARCH_LOCATION", payload: location });

            // Search for GPs near user's location
            searchForGPs(location);
          }
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsSearching(false);

        localStorage.setItem("locationPermission", "denied");
        localStorage.setItem("locationPrompted", "true");

        // Provide user-friendly error messages
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationPermissionState("denied");
            setError(
              "Location access denied. Please enable location services."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setError("Location request timed out.");
            break;
          default:
            setError("An unknown error occurred while getting your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handle when a place is selected
  const handlePlaceSelect = (place: any) => {
    console.log("Handling place selection:", place);

    if (!place.geometry || !place.geometry.location) {
      console.error("Place has no geometry:", place);
      setError("No location details available for this place");
      return;
    }

    try {
      // Get the selected location details
      const location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: place.formatted_address || place.name || "",
      };

      console.log("Location selected:", location);

      // Update the context with the search location
      dispatch({ type: "SET_SEARCH_LOCATION", payload: location });

      // Search for GPs near this location
      searchForGPs(location);
    } catch (error) {
      console.error("Error processing place selection:", error);
      setError("Failed to process location. Please try again.");
    }
  };

  // Function to search for GPs near a location
  const searchForGPs = async (location: {
    lat: number;
    lng: number;
    address: string;
  }) => {
    console.log("Searching for GPs near:", location);
    setIsSearching(true);
    setError(null);

    // Clear previous results
    dispatch({ type: "CLEAR_RESULTS" });

    try {
      // Create a mapDiv for the PlacesService (required by the API)
      const mapDiv = document.createElement("div");
      document.body.appendChild(mapDiv);

      const map = new window.google.maps.Map(mapDiv, {
        center: { lat: location.lat, lng: location.lng },
        zoom: 15,
      });

      // Prepare to search for "GP" or "doctor" near the selected location
      const service = new window.google.maps.places.PlacesService(map);

      const request = {
        location: new window.google.maps.LatLng(location.lat, location.lng),
        radius: 2000, // 2km radius
        keyword: "GP doctor general practitioner",
        type: "health",
      };

      console.log("Making nearby search with request:", request);

      service.nearbySearch(request, async (results, status) => {
        console.log("Search results:", results);
        console.log("Search status:", status);

        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results &&
          results.length > 0
        ) {
          // Format basic results first
          const basicResults = results.map((place) => {
            const lat = place.geometry?.location?.lat();
            const lng = place.geometry?.location?.lng();

            return {
              id: place.place_id || String(Math.random()),
              name: place.name || "Unnamed Location",
              vicinity: place.vicinity || "",
              location: {
                lat: lat || 0,
                lng: lng || 0,
              },
              rating: place.rating || 0,
              user_ratings_total: place.user_ratings_total || 0,
              place_id: place.place_id || "",
              isTopThree: false, // Will be set after sorting
            };
          });

          // Sort results by rating (primary) and user_ratings_total (secondary)
          const sortedResults = [...basicResults].sort((a, b) => {
            // If ratings are the same, sort by number of reviews
            if (b.rating === a.rating) {
              return b.user_ratings_total - a.user_ratings_total;
            }
            // Otherwise sort by rating
            return b.rating - a.rating;
          });

          // Mark top 3 results
          if (sortedResults.length > 0) sortedResults[0].isTopThree = true;
          if (sortedResults.length > 1) sortedResults[1].isTopThree = true;
          if (sortedResults.length > 2) sortedResults[2].isTopThree = true;

          console.log("Sorted and ranked results:", sortedResults);

          // Update the context with search results
          dispatch({ type: "SET_SEARCH_RESULTS", payload: sortedResults });

          // Also select the best result by default
          if (sortedResults.length > 0) {
            dispatch({ type: "SELECT_RESULT", payload: sortedResults[0] });
          }
        } else {
          setError("No GP practices found near this location");
        }

        setIsSearching(false);
        // Clean up the map div
        document.body.removeChild(mapDiv);
      });
    } catch (error) {
      console.error("Error searching for GPs:", error);
      setIsSearching(false);
      setError("Failed to search for GP practices. Please try again.");
    }
  };

  // Handle location modal responses
  const handleLocationModalResponse = (allow: boolean) => {
    setShowLocationModal(false);
    localStorage.setItem("locationPrompted", "true");

    if (allow) {
      getUserLocation();
    } else {
      localStorage.setItem("locationPermission", "denied");
    }
  };

  // Show permission instruction guide
  const showLocationPermissionPrompt = () => {
    return (
      <div className="location-permission-prompt">
        <h3>Enable Location Services</h3>
        <p>
          To find GP practices near you, please enable location services in your
          browser.
        </p>
        <div className="steps">
          <p>
            <strong>How to enable:</strong>
          </p>
          <ol>
            <li>Click the lock/info icon in your browser address bar</li>
            <li>Select "Location" or "Site Settings"</li>
            <li>Choose "Allow" for this website</li>
            <li>Refresh the page</li>
          </ol>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="refresh-button"
        >
          Refresh Page
        </button>
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (autocompleteRef.current) {
      try {
        const place = autocompleteRef.current.getPlace();
        if (place && place.geometry) {
          handlePlaceSelect(place);
        } else {
          setError("Please select a location from the dropdown");
        }
      } catch (error) {
        console.error("Error getting place:", error);
        setError("Failed to process location. Please try again.");
      }
    }
  };

  return (
    <div className="search-container">
      {/* Location Permission Modal */}
      {showLocationModal && (
        <div className="location-permission-modal">
          <div className="modal-content">
            <div className="location-icon-large">📍</div>
            <h2>Find GP Practices Near You</h2>
            <p>
              Would you like to use your current location to find the nearest GP
              practices? This will help us show you the most relevant results.
            </p>
            <div className="modal-actions">
              <button
                className="secondary"
                onClick={() => handleLocationModalResponse(false)}
              >
                Not Now
              </button>
              <button
                className="primary"
                onClick={() => handleLocationModalResponse(true)}
              >
                Use My Location
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter a location to find GPs nearby..."
            className="search-input"
            disabled={isSearching}
          />
          <div
            ref={autocompleteWrapperRef}
            className="autocomplete-wrapper"
          ></div>
          <button
            type="submit"
            className="search-button"
            disabled={isSearching}
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="location-button-container">
          <button
            type="button"
            className="use-location-button"
            onClick={getUserLocation}
            disabled={isSearching}
          >
            <span className="location-icon">📍</span> Use my location
          </button>
        </div>
      </form>

      {error &&
        error.includes("Location access denied") &&
        showLocationPermissionPrompt()}
      {error && !error.includes("Location access denied") && (
        <div className="search-error">{error}</div>
      )}
      {isSearching && (
        <div className="search-status">Searching for GP practices...</div>
      )}
    </div>
  );
};

export default Search;
