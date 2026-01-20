// src/components/routes/RouteMap.js
// Purpose: Display route map using Google Maps embed

import { Box, Typography, Paper } from "@mui/material";

/**
 * Convert PostGIS LineString WKT to Google Maps embed URL
 * PostGIS format: LINESTRING(lon1 lat1, lon2 lat2, ...)
 * Google Maps embed needs: lat1,lon1|lat2,lon2|...
 */
function lineStringToGoogleMapsEmbed(lineStringWKT) {
  if (!lineStringWKT || typeof lineStringWKT !== "string") {
    return null;
  }

  // Extract coordinates from LINESTRING format
  // Example: "LINESTRING(18.4241 -33.9249, 18.426 -33.9235)"
  const coordsMatch = lineStringWKT.match(/LINESTRING\((.+)\)/);
  if (!coordsMatch) {
    return null;
  }

  // Parse coordinates: "lon lat, lon lat, ..."
  const coords = coordsMatch[1]
    .split(",")
    .map((pair) => {
      const [lon, lat] = pair.trim().split(" ");
      return { lat: parseFloat(lat), lon: parseFloat(lon) };
    })
    .filter((c) => !isNaN(c.lat) && !isNaN(c.lon));

  if (coords.length === 0) {
    return null;
  }

  // Calculate center point for map
  const centerLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
  const centerLon = coords.reduce((sum, c) => sum + c.lon, 0) / coords.length;

  // Build path string for polyline: lat,lon|lat,lon|...
  const pathString = coords.map((c) => `${c.lat},${c.lon}`).join("|");

  // Google Maps embed URL with path
  const embedUrl = `https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}&origin=${coords[0].lat},${coords[0].lon}&destination=${coords[coords.length - 1].lat},${coords[coords.length - 1].lon}&waypoints=${pathString}`;

  // Alternative: Use static map with path (no API key needed for basic usage)
  // But embed requires API key. Let's use a simpler approach with static map
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x400&path=color:0xff0000ff|weight:5|${pathString}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}`;

  return {
    center: { lat: centerLat, lon: centerLon },
    path: pathString,
    coords,
    embedUrl: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? embedUrl : null,
    staticMapUrl: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? staticMapUrl : null,
  };
}

export default function RouteMap({ route, stageNumber }) {
  if (!route) {
    return (
      <Paper sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Route map not available
        </Typography>
      </Paper>
    );
  }

  // Try to get geography data - it might be in different formats
  const gpxGeo = route.gpx_geo || route.gpx_geo_text;
  let mapData = null;

  // Try to parse the geography data
  if (gpxGeo) {
    if (typeof gpxGeo === "string") {
      mapData = lineStringToGoogleMapsEmbed(gpxGeo);
    } else if (gpxGeo.type === "LineString" && Array.isArray(gpxGeo.coordinates)) {
      // Handle GeoJSON format
      const coords = gpxGeo.coordinates.map(([lon, lat]) => ({ lat, lon }));
      const centerLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
      const centerLon = coords.reduce((sum, c) => sum + c.lon, 0) / coords.length;
      const pathString = coords.map((c) => `${c.lat},${c.lon}`).join("|");
      
      mapData = {
        center: { lat: centerLat, lon: centerLon },
        path: pathString,
        coords,
        embedUrl: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 
          ? `https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&origin=${coords[0].lat},${coords[0].lon}&destination=${coords[coords.length - 1].lat},${coords[coords.length - 1].lon}&waypoints=${pathString}`
          : null,
      };
    }
  }

  // If we have coordinates, show map
  if (mapData && mapData.coords && mapData.coords.length > 0) {
    // Use Google Maps embed if API key is available
    if (mapData.embedUrl && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      return (
        <Paper sx={{ p: 0, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ flex: 1, minHeight: 0, position: "relative" }}>
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0, position: "absolute", top: 0, left: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={mapData.embedUrl}
              title={`Stage ${stageNumber} Route Map`}
            />
          </Box>
        </Paper>
      );
    }

    // Fallback: Use Google Maps URL with route path
    // Create a URL that opens Google Maps with the route
    // For embed, we'll use a simple directions URL that works without API key
    const startPoint = mapData.coords[0];
    const endPoint = mapData.coords[mapData.coords.length - 1];
    
    // Use Google Maps embed with directions (requires API key) or use a link
    // For now, use a basic embed URL that shows the route area
    const mapUrl = `https://www.google.com/maps?q=${mapData.center.lat},${mapData.center.lon}&z=13`;
    
    return (
      <Paper sx={{ p: 0, overflow: "hidden", position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            width: "100%",
            flex: 1,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "grey.100",
            position: "relative",
          }}
        >
          <Box sx={{ textAlign: "center", p: 3 }}>
            <Typography variant="body1" gutterBottom>
              Stage {stageNumber} Route
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {mapData.coords.length} waypoints
            </Typography>
            <Box
              component="a"
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: "inline-block",
                px: 3,
                py: 1.5,
                bgcolor: "primary.main",
                color: "white",
                textDecoration: "none",
                borderRadius: 1,
                "&:hover": {
                  bgcolor: "primary.dark",
                },
              }}
            >
              View Route on Google Maps
            </Box>
            {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
                Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for embedded map view
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>
    );
  }

  // Fallback if no route data
  return (
    <Paper sx={{ p: 2, textAlign: "center", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Typography variant="body2" color="text.secondary">
        Route coordinates not available for this stage
      </Typography>
    </Paper>
  );
}
