// src/pages/routes.js
// Purpose: Display challenge routes with GPX maps

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Container, Typography, Paper, Box, Divider, Tabs, Tab, Button } from "@mui/material";
import AppHeader from "../components/common/AppHeader";
import { fetchRoutesForMap } from "../services/routeService";

const RouteMap = dynamic(() => import("../components/RouteMap"), { ssr: false });
import { fetchActiveChallenge } from "../services/challengeService";
import LoadingState from "../components/common/LoadingState";
import { OUTRUN_WHITE, OUTRUN_BLACK } from "../styles/theme";

export default function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState(1);
  const [googleMapsUrl, setGoogleMapsUrl] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [routesData, challengeData] = await Promise.all([
        fetchRoutesForMap(),
        fetchActiveChallenge(),
      ]);
      setRoutes(routesData || []);
      setChallenge(challengeData);
    } catch (err) {
      console.error("Failed to load routes", err);
    } finally {
      setLoading(false);
    }
  };

  // Group routes by stage number
  const routesByStage = {};
  routes.forEach((route) => {
    routesByStage[route.stage_number] = route;
  });

  const handleStageChange = (event, newValue) => {
    setSelectedStage(newValue);
    setGoogleMapsUrl(null);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <AppHeader />
        <Container maxWidth="md" sx={{ py: 2, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LoadingState />
        </Container>
      </Box>
    );
  }

  const selectedRoute = routesByStage[selectedStage];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <AppHeader />

      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Container
          maxWidth="md"
          sx={{
            py: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minHeight: 0,
          }}
        >
          <Paper sx={{ p: 2, mb: 2, flexShrink: 0 }}>
            <Typography variant="h5" gutterBottom>
              Challenge Routes
            </Typography>
            {challenge && (
              <Typography variant="body1" color="text.primary">
                {challenge.name}
              </Typography>
            )}
          </Paper>

          {/* Stage Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2, flexShrink: 0 }}>
            <Tabs
              value={selectedStage}
              onChange={handleStageChange}
              aria-label="stage tabs"
              variant="fullWidth"
              sx={{
                "& .MuiTab-root": {
                  color: OUTRUN_WHITE,
                  "&.Mui-selected": {
                    color: OUTRUN_BLACK,
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: OUTRUN_BLACK,
                },
              }}
            >
              <Tab label="Stage 1" value={1} />
              <Tab label="Stage 2" value={2} />
              <Tab label="Stage 3" value={3} />
            </Tabs>
          </Box>

          {/* Selected Stage Route */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
            }}
          >
            {routes.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body1" color="text.secondary">
                  No routes available for the active challenge
                </Typography>
              </Paper>
            ) : (
              <Paper sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
                <Box sx={{ mb: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                  <Box>
                    <Typography variant="h5" gutterBottom>
                      Stage {selectedStage}
                    </Typography>
                    {selectedRoute && (
                      <Typography variant="body2" color="text.primary">
                        Buffer: {selectedRoute.buffer_meters}m • Min Overlap: {(selectedRoute.min_overlap_ratio ?? 0.8) * 100}%
                      </Typography>
                    )}
                  </Box>
                  {googleMapsUrl && (
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
                  )}
                </Box>
                <Divider sx={{ mb: 2, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <RouteMap challenge={challenge?.slug ?? "challenge_1"} stage={`stage-${selectedStage}`} onGoogleMapsUrl={setGoogleMapsUrl} />
                </Box>
              </Paper>
            )}
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
