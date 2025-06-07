import React, { createContext, useState, useContext, useEffect } from 'react';

interface LocationContextType {
  userLocation: string;
  coords: { lat: number, lng: number } | null;
  loading: boolean;
}

const LocationContext = createContext<LocationContextType>({
  userLocation: "Loading...",
  coords: null,
  loading: true
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [userLocation, setUserLocation] = useState("Loading...");
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoords({ lat: latitude, lng: longitude });
          
          try {
            const response = await fetch(
              `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=29a8d0f8953c4dd9916f235c1aefe163`
            );
            const data = await response.json();
            const city = data.results[0].components.city || data.results[0].components.town;
            const postcode = data.results[0].components.postcode;
            setUserLocation(`${city} - ${postcode}`);
          } catch (error) {
            setUserLocation("Error fetching location");
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          setUserLocation("Location access denied");
          setLoading(false);
        }
      );
    } else {
      setUserLocation("Geolocation not supported");
      setLoading(false);
    }
  }, []);

  return (
    <LocationContext.Provider value={{ 
      userLocation, 
      coords, 
      loading 
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}