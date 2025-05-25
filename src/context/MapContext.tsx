import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";

// Define the types for your state
interface Location {
  lat: number;
  lng: number;
  address: string;
}

// Update the SearchResult interface

// In MapContext.tsx
// In MapContext.tsx, update your SearchResult interface:
export interface SearchResult {
  id: string;
  name: string;
  vicinity: string;
  location: {
    lat: number;
    lng: number;
  };
  rating: number;
  user_ratings_total: number;
  place_id: string;
  // These might be null if the details request failed
  phone_number: string | null;
  website: string | null;
  opening_hours: {
    weekday_text?: string[];
    periods?: any[];
    isOpen?: () => boolean;
  } | null;
  google_maps_url?: string | null;
  isTopThree: boolean;
  // Add the new fields for private practice detection
  isPrivatePractice?: boolean;
  privateKeywordsFound?: string[];
  nhsKeywordsFound?: string[];
  privateConfidence?: number;
}

interface MapState {
  searchLocation: Location | null;
  searchResults: SearchResult[];
  selectedResult: SearchResult | null;
  includePrivateGPs: boolean;
}

type MapAction =
  | { type: "SET_SEARCH_LOCATION"; payload: Location }
  | { type: "SET_SEARCH_RESULTS"; payload: SearchResult[] }
  | { type: "SELECT_RESULT"; payload: SearchResult | null }
  | { type: "CLEAR_RESULTS" }
  | { type: "SET_INCLUDE_PRIVATE_GPS"; payload: boolean };

// Initial state
const initialState: MapState = {
  searchLocation: null,
  searchResults: [],
  selectedResult: null,
  includePrivateGPs: false, // Add this line
};

// Create the context
const MapContext = createContext<{
  state: MapState;
  dispatch: React.Dispatch<MapAction>;
}>({ state: initialState, dispatch: () => null });

// Reducer function
const mapReducer = (state: MapState, action: MapAction): MapState => {
  switch (action.type) {
    case "SET_SEARCH_LOCATION":
      return {
        ...state,
        searchLocation: action.payload,
      };
    case "SET_SEARCH_RESULTS":
      return {
        ...state,
        searchResults: action.payload,
      };
    case "SELECT_RESULT":
      return {
        ...state,
        selectedResult: action.payload,
      };
    case "CLEAR_RESULTS":
      return {
        ...state,
        searchResults: [],
        selectedResult: null,
      };
    case "SET_INCLUDE_PRIVATE_GPS":
      return {
        ...state,
        includePrivateGPs: action.payload,
      };
    default:
      return state;
  }
};

// Provider component
export const MapProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(mapReducer, initialState);

  return (
    <MapContext.Provider value={{ state, dispatch }}>
      {children}
    </MapContext.Provider>
  );
};

// Custom hook to use the context
export const useMapContext = () => useContext(MapContext);
