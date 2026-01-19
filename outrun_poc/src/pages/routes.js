// src/pages/routes.js
// Purpose: Display challenge routes with GPX maps

import { useState, useEffect } from "react";
import { Container, Stack, Typography, Paper, Box, Divider } from "@mui/material";
import AppHeader from "../components/common/AppHeader";
import RouteMap from "../components/routes/RouteMap";
import { fetchActiveChallengeRoutes } from "../services/routeService";
import { fetchActiveChallenge } from "../services/challengeService";
import LoadingState from "../components/common/LoadingState";

export default function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <>
        <AppHeader />
        <Container maxWidth="md">
          <LoadingState />
        </Container>
      </>
    );
  }

  // Group routes by stage number
  const routesByStage = {};
  routes.forEach((route) => {
    routesByStage[route.stage_number] = route;
  });

  return (
    <>
      <AppHeader />

      <Container maxWidth="md">
        <Stack spacing={3} mt={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Challenge Routes
            </Typography>
            {challenge && (
              <Typography variant="body1" color="text.secondary">
                {challenge.name}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              View the GPX routes for each stage of the challenge
            </Typography>
          </Paper>

          {/* Display routes for stages 1-3 */}
          {[1, 2, 3].map((stageNum) => {
            const route = routesByStage[stageNum];
            return (
              <Paper key={stageNum} sx={{ p: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h5" gutterBottom>
                    Stage {stageNum}
                  </Typography>
                  {route && (
                    <Typography variant="body2" color="text.secondary">
                      Buffer: {route.buffer_meters}m • Min Overlap: {route.min_overlap_ratio * 100}%
                    </Typography>
                  )}
                </Box>
                <Divider sx={{ mb: 2 }} />
                <RouteMap route={route} stageNumber={stageNum} />
              </Paper>
            );
          })}

          {routes.length === 0 && (
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body1" color="text.secondary">
                No routes available for the active challenge
              </Typography>
            </Paper>
          )}
        </Stack>
      </Container>
    </>
  );
}
