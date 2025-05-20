import { GOOGLE_MAPS_API_KEY } from "../config";

let googleMapsPromise: Promise<void> | null = null;

export const loadGoogleMapsApi = (): Promise<void> => {
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  // Create a promise to track the loading status
  googleMapsPromise = new Promise((resolve, reject) => {
    // Define a callback function that will be called when the API is loaded
    const callbackName = "googleMapsInitCallback";

    // Add the callback to the window object
    (window as any)[callbackName] = function () {
      resolve();
    };

    // Check if the API is already loaded
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    // Create and append the script element
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=${callbackName}&v=weekly&loading=async&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      reject(new Error("Google Maps failed to load"));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};
