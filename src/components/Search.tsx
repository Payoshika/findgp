import React, { useState, useEffect, useRef } from "react";
import { loadGoogleMapsApi } from "../utilities/loadGoogleMap";
import { useMapContext } from "../context/MapContext";

const Search = () => {
  // Use the context
  const { state, dispatch } = useMapContext();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const autocompleteWrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  // Add this with your other state variables
  const { searchLocation, searchResults } = state;

  // Location states
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [locationPermissionState, setLocationPermissionState] = useState<
    "unknown" | "granted" | "denied" | "prompt"
  >("unknown");

  useEffect(() => {
    // Force reset includePrivateGPs to false on component mount
    dispatch({ type: "SET_INCLUDE_PRIVATE_GPS", payload: false });
  }, []);
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

  // Modify this useEffect to add more conditions
  useEffect(() => {
    console.log("includePrivateGPs changed to:", state.includePrivateGPs);

    // Only re-search if we have a location and either:
    // 1) We have results already, or
    // 2) We previously searched but got no results
    if (
      state.searchLocation &&
      (state.searchResults.length > 0 ||
        document.querySelector(".search-error")) // Check if we have an error message
    ) {
      console.log("Effect triggered search with:", state.includePrivateGPs);
      searchForGPs(state.searchLocation, state.includePrivateGPs);
    }
  }, [state.includePrivateGPs]);

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
            searchForGPs(location, state.includePrivateGPs);
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
            searchForGPs(location, state.includePrivateGPs);
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
      searchForGPs(location, state.includePrivateGPs);
    } catch (error) {
      console.error("Error processing place selection:", error);
      setError("Failed to process location. Please try again.");
    }
  };

  // Function to search for GPs near a location
  // In your search.tsx file:

  // Function to search for GPs near a location
  // Update your searchForGPs function to handle private GP filtering
  // Update your searchForGPs function with the web scraping integration
  // Function to search for GPs near a location
  const searchForGPs = async (
    location: {
      lat: number;
      lng: number;
      address: string;
    },
    includePrivate: boolean
  ) => {
    console.log("private gps", includePrivate);
    console.log(
      "Searching for GPs near:",
      location,
      "with includePrivateGPs:",
      includePrivate
    );
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

      // Adjust search keywords based on includePrivateGPs toggle
      const searchKeyword = state.includePrivateGPs
        ? "GP doctor general practitioner"
        : "GP doctor general practitioner -private";

      const request = {
        location: new window.google.maps.LatLng(location.lat, location.lng),
        radius: 2000, // 2km radius
        keyword: searchKeyword,
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
          // Initial filtering based on name
          let filteredResults = results;
          if (!state.includePrivateGPs) {
            filteredResults = results.filter(
              (place) =>
                !(place.name && place.name.toLowerCase().includes("private"))
            );
            console.log(
              `Filtered out ${
                results.length - filteredResults.length
              } private practices by name`
            );
          }

          // Format basic results
          const basicResults = filteredResults.map((place) => {
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
              phone_number: null,
              website: null,
              opening_hours: null,
              isPrivatePractice: false, // Default assumption
              isTopThree: false, // Will be set after sorting
            };
          });

          // // Dispatch initial results to show something to the user quickly
          // dispatch({ type: "SET_SEARCH_RESULTS", payload: basicResults });

          // if (basicResults.length > 0) {
          //   dispatch({ type: "SELECT_RESULT", payload: basicResults[0] });
          // }

          // Fetch details for each place including website
          let detailedResults = await Promise.all(
            basicResults.map(async (result) => {
              return new Promise<SearchResult>((resolve) => {
                service.getDetails(
                  {
                    placeId: result.place_id,
                    fields: [
                      "formatted_phone_number",
                      "website",
                      "opening_hours",
                    ],
                  },
                  (placeDetails, detailsStatus) => {
                    if (
                      detailsStatus ===
                        window.google.maps.places.PlacesServiceStatus.OK &&
                      placeDetails
                    ) {
                      resolve({
                        ...result,
                        phone_number:
                          placeDetails.formatted_phone_number || null,
                        website: placeDetails.website || null,
                        opening_hours: placeDetails.opening_hours || null,
                      });
                    } else {
                      console.log(
                        `Could not get details for ${result.name}:`,
                        detailsStatus
                      );
                      resolve(result);
                    }
                  }
                );
              });
            })
          );

          // Update with detailed results
          // dispatch({ type: "SET_SEARCH_RESULTS", payload: detailedResults });

          // ONLY check websites when we want to exclude private GPs
          if (!includePrivate) {
            console.log("Excluding private GPs - checking websites...");
            // Define a batch size to prevent too many parallel requests
            const batchSize = 3;
            const privatePracticeIds = new Set<string>();
            // Process in batches
            for (let i = 0; i < detailedResults.length; i += batchSize) {
              console.log(`Processing batch ${i / batchSize + 1}...`);
              const batch = detailedResults.slice(i, i + batchSize);

              // Run batch in parallel but limit size
              const batchResults = await Promise.all(
                batch.map(async (result) => {
                  // Only check websites if we have one
                  if (result.website) {
                    try {
                      // Use encodeURIComponent for safe URL encoding
                      const apiEndpoint =
                        "https://gp-checker-api.vercel.app/api/check-website?url=" +
                        result.website;

                      console.log(
                        `Checking ${result.name} website: ${result.website}`
                      );
                      const response = await fetch(apiEndpoint);

                      if (response.ok) {
                        const data = await response.json();

                        if (data.isPrivate) {
                          console.log(
                            `${result.name} detected as private:`,
                            data
                          );
                          privatePracticeIds.add(result.id);
                          return {
                            ...result,
                            isPrivatePractice: true,
                            privateKeywordsFound: data.privateKeywordsFound,
                            nhsKeywordsFound: data.nhsKeywordsFound,
                            privateConfidence: data.confidence,
                          } as SearchResult;
                        } else {
                          console.log(`${result.name} is not private`);
                        }
                      } else {
                        console.log(
                          `Failed to check ${result.name}:`,
                          response.statusText
                        );
                      }
                    } catch (error) {
                      console.log(
                        `Error checking if ${result.name} is private:`,
                        error
                      );
                    }
                  }
                  return result;
                })
              );

              // Update the detailed results with the batch results
              detailedResults = detailedResults.map((result) => {
                const updatedResult = batchResults.find(
                  (br) => br.id === result.id
                );
                return updatedResult || result;
              });

              // Update results after each batch to show progress
              //   dispatch({
              //     type: "SET_SEARCH_RESULTS",
              //     payload: detailedResults,
              //   });
            }

            // Only filter when we're excluding private GPs
            const finalResults = detailedResults.filter(
              (result) => !privatePracticeIds.has(result.id)
            );

            console.log(
              `Filtered out ${
                detailedResults.length - finalResults.length
              } private practices by website content`
            );

            // Only sort the filtered results
            const sortedResults = [...finalResults].sort((a, b) => {
              const aScore = calculateConfidenceScore(
                a.rating,
                a.user_ratings_total
              );
              const bScore = calculateConfidenceScore(
                b.rating,
                b.user_ratings_total
              );
              return bScore - aScore;
            });

            // Mark top 3 results
            if (sortedResults.length > 0) sortedResults[0].isTopThree = true;
            if (sortedResults.length > 1) sortedResults[1].isTopThree = true;
            if (sortedResults.length > 2) sortedResults[2].isTopThree = true;

            // Update with final filtered results
            dispatch({ type: "SET_SEARCH_RESULTS", payload: sortedResults });

            // Select the first result
            if (sortedResults.length > 0) {
              dispatch({ type: "SELECT_RESULT", payload: sortedResults[0] });
            } else if (detailedResults.length > 0) {
              // If we filtered everything out, show a message
              setError(
                "No NHS GP practices found. Try including private practices."
              );
            }
          } else {
            // When including private GPs, skip the website checks entirely
            console.log("Including private GPs - skipping website checks");
            // Just sort and mark top 3 without filtering
            const sortedResults = [...detailedResults].sort((a, b) => {
              const aScore = calculateConfidenceScore(
                a.rating,
                a.user_ratings_total
              );
              const bScore = calculateConfidenceScore(
                b.rating,
                b.user_ratings_total
              );
              return bScore - aScore;
            });

            // Mark top 3 results
            if (sortedResults.length > 0) sortedResults[0].isTopThree = true;
            if (sortedResults.length > 1) sortedResults[1].isTopThree = true;
            if (sortedResults.length > 2) sortedResults[2].isTopThree = true;

            // Update with final sorted results
            dispatch({ type: "SET_SEARCH_RESULTS", payload: sortedResults });

            // Select the first result
            if (sortedResults.length > 0) {
              dispatch({ type: "SELECT_RESULT", payload: sortedResults[0] });
            }
          }
        } else {
          setError("No GP practices found near this location");
          console.error("Places search failed with status:", status);
        }

        setIsSearching(false);
        // Clean up the map div
        document.body.removeChild(mapDiv);
      });
    } catch (error) {
      console.error("Error during nearby search:", error);
      setError("Failed to search for GP practices. Please try again.");
      setIsSearching(false);

      // Clean up the map div if it was created
      try {
        const mapDiv = document.querySelector(
          "div[style*='position: absolute']"
        );
        if (mapDiv && mapDiv.parentNode) {
          mapDiv.parentNode.removeChild(mapDiv);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up map div:", cleanupError);
      }
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

  // Import or define the calculateConfidenceScore function in search.tsx
  const calculateConfidenceScore = (
    rating: number,
    totalRatings: number
  ): number => {
    if (totalRatings === 0) return 0;

    // Set a minimum threshold for reviews to qualify for top ratings
    // This will severely penalize places with very few reviews
    const minimumReviewsThreshold = 5;
    const reviewThresholdPenalty =
      totalRatings < minimumReviewsThreshold
        ? (minimumReviewsThreshold - totalRatings) * 0.5
        : 0;

    // Normalize rating from 0-5 scale to 0-1 scale
    const p = rating / 5;

    // z score for 95% confidence interval is ~1.96
    const z = 1.96;

    // Basic Wilson score calculation
    const numerator = p + (z * z) / (2 * totalRatings);
    const denominator = 1 + (z * z) / totalRatings;
    const radicand =
      (p * (1 - p)) / totalRatings +
      (z * z) / (4 * totalRatings * totalRatings);

    const wilsonScore =
      ((numerator - z * Math.sqrt(radicand)) / denominator) * 5;

    // Apply a review count bonus (logarithmic scale to prevent excessive domination)
    // Increased weight to prioritize places with many reviews
    const reviewCountBonus = Math.log10(totalRatings + 1) * 0.4;

    // Add a rating bonus for high-rated places (4.5+)
    // This will give a boost to places with excellent ratings
    const ratingBonus = rating >= 4.5 ? 0.3 : rating >= 4.0 ? 0.15 : 0;

    // Apply the review threshold penalty and cap the final score at 5.0
    return Math.max(
      0,
      Math.min(
        wilsonScore + reviewCountBonus + ratingBonus - reviewThresholdPenalty,
        5.0
      )
    );
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
  const handleTogglePrivateGPs = () => {
    // Get the current value before toggling
    const currentValue = state.includePrivateGPs;
    console.log("Current includePrivateGPs value:", currentValue);

    // Calculate new value
    const newValue = !currentValue;
    console.log("Setting to:", newValue);

    // Update state
    dispatch({ type: "SET_INCLUDE_PRIVATE_GPS", payload: newValue });

    // Immediately search with the NEW value (not using state which might not have updated yet)
    if (state.searchLocation) {
      // Create a new search function that takes the includePrivateGPs value as a parameter
      searchForGPs(state.searchLocation, newValue);
    }
  };

  return (
    <div className="search search-container">
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
          {isSearching && <div className="search-loader"></div>}
        </div>
      </form>

      <div className="search-options-container">
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
        <div className="search-options">
          <label className="toggle-container">
            <input
              type="checkbox"
              checked={state.includePrivateGPs}
              onChange={handleTogglePrivateGPs}
              disabled={isSearching}
            />
            <span className="toggle-switch"></span>
            <span className="toggle-label">Include private GPs</span>
            <span className="toggle-status">
              {state.includePrivateGPs ? "(On)" : "(Off)"}
            </span>
          </label>
        </div>
      </div>

      {error &&
        error.includes("Location access denied") &&
        showLocationPermissionPrompt()}
      {error && !error.includes("Location access denied") && (
        <div className="search-error">{error}</div>
      )}
      {isSearching && (
        <div className="search-status">
          <p>Searching for GP practices..</p>
        </div>
      )}
    </div>
  );
};

export default Search;
