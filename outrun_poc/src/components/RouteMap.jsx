// src/components/RouteMap.jsx
// Purpose: Embedded route map using Leaflet + OSM (no Google API key). Client-only.

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from "react-leaflet";
import { Box, Typography, Paper, Button } from "@mui/material";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ROUTE_COLOR = "#C45A2A";
const ROUTE_WEIGHT = 4;

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length === 2) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
    }
  }, [map, bounds]);
  return null;
}

function RouteContent({ geojson, bounds, meta, onGeometryLoaded }) {
  useEffect(() => {
    onGeometryLoaded?.({ geojson, bounds, meta });
  }, [geojson, bounds, meta, onGeometryLoaded]);

  if (!geojson?.geometry?.coordinates?.length) return null;

  const coords = geojson.geometry.coordinates;
  const start = coords[0];
  const end = coords[coords.length - 1];
  const startLatLng = [start[1], start[0]];
  const endLatLng = [end[1], end[0]];

  const style = () => ({ color: ROUTE_COLOR, weight: ROUTE_WEIGHT });

  return (
    <>
      <FitBounds bounds={bounds} />
      <GeoJSON data={geojson} style={style} />
      <CircleMarker center={startLatLng} radius={8} pathOptions={{ color: ROUTE_COLOR, fillColor: ROUTE_COLOR, weight: 2, fillOpacity: 1 }}>
        <Popup>Start</Popup>
      </CircleMarker>
      <CircleMarker center={endLatLng} radius={8} pathOptions={{ color: ROUTE_COLOR, fillColor: ROUTE_COLOR, weight: 2, fillOpacity: 1 }}>
        <Popup>End</Popup>
      </CircleMarker>
    </>
  );
}

export default function RouteMap({ challenge, stage }) {
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!challenge || !stage) {
      setStatus("error");
      setError("Missing challenge or stage");
      return;
    }
    setStatus("loading");
    setError(null);
    const url = `/api/route-geometry?challenge=${encodeURIComponent(challenge)}&stage=${encodeURIComponent(stage)}&simplify=1`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Route not found" : `Failed to load (${res.status})`);
        return res.json();
      })
      .then((json) => {
        setData(json);
        setStatus("success");
      })
      .catch((err) => {
        setError(err.message || "Failed to load route");
        setStatus("error");
      });
  }, [challenge, stage]);

  const [geomForLink, setGeomForLink] = useState(null);
  const googleMapsUrl =
    geomForLink?.geojson?.geometry?.coordinates?.length >= 2
      ? (() => {
          const c = geomForLink.geojson.geometry.coordinates;
          const start = c[0];
          const end = c[c.length - 1];
          const lat1 = start[1];
          const lng1 = start[0];
          const lat2 = end[1];
          const lng2 = end[0];
          return `https://www.google.com/maps/dir/?api=1&origin=${lat1},${lng1}&destination=${lat2},${lng2}`;
        })()
      : null;

  if (status === "loading") {
    return (
      <Paper sx={{ p: 2, textAlign: "center", height: "100%", minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Loading map…
        </Typography>
      </Paper>
    );
  }

  if (status === "error") {
    return (
      <Paper sx={{ p: 2, textAlign: "center", height: "100%", minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {googleMapsUrl && (
        <Box sx={{ flexShrink: 0, mb: 1 }}>
          <Button
            component="a"
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            size="small"
          >
            View on Google Maps
          </Button>
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 280, borderRadius: 1, overflow: "hidden" }}>
        <MapContainer
          style={{ height: "100%", width: "100%" }}
          center={[data.bounds[0][0], data.bounds[0][1]]}
          zoom={12}
          scrollWheelZoom={true}
        >
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url={OSM_URL} />
          <RouteContent geojson={data.geojson} bounds={data.bounds} meta={data.meta} onGeometryLoaded={setGeomForLink} />
        </MapContainer>
      </Box>
    </Box>
  );
}
