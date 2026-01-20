// src/pages/routes.js
// Purpose: Display challenge routes with GPX maps

import { useState, useEffect } from "react";
import { Container, Stack, Typography, Paper, Box, Divider, Tabs, Tab } from "@mui/material";
import AppHeader from "../components/common/AppHeader";
import RouteMap from "../components/routes/RouteMap";
import { fetchActiveChallengeRoutes } from "../services/routeService";
import { fetchActiveChallenge } from "../services/challengeService";
import LoadingState from "../components/common/LoadingState";

export default function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [routesData, challengeData] = await Promise.all([
        fetchActiveChallengeRoutes(),
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
            <Typography variant="h4" gutterBottom>
              Challenge Routes
            </Typography>
            {challenge && (
              <Typography variant="body1" color="text.secondary">
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
            <Paper sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
              <Box sx={{ mb: 2, flexShrink: 0 }}>
                <Typography variant="h5" gutterBottom>
                  Stage {selectedStage}
                </Typography>
                {selectedRoute && (
                  <Typography variant="body2" color="text.secondary">
                    Buffer: {selectedRoute.buffer_meters}m • Min Overlap: {selectedRoute.min_overlap_ratio * 100}%
                  </Typography>
                )}
              </Box>
              <Divider sx={{ mb: 2, flexShrink: 0 }} />
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <RouteMap route={selectedRoute} stageNumber={selectedStage} />
              </Box>
            </Paper>

            {routes.length === 0 && (
              <Paper sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body1" color="text.secondary">
                  No routes available for the active challenge
                </Typography>
              </Paper>
            )}
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
