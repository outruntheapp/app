// src/pages/leaderboard.js
// Purpose: Public leaderboard page

import { useState, useEffect } from "react";
import { Container, Stack, Tabs, Tab, Box, Typography, Paper } from "@mui/material";
import AppHeader from "../components/common/AppHeader";
import OverallLeaderboardTable from "../components/leaderboard/OverallLeaderboardTable";
import StageLeaderboardTable from "../components/leaderboard/StageLeaderboardTable";
import { fetchOverallLeaderboard, fetchStageLeaderboard } from "../services/leaderboardService";
import { formatDuration } from "../utils/time";
import { OUTRUN_WHITE, OUTRUN_BLACK } from "../styles/theme";

export default function LeaderboardPage() {
  const [tabValue, setTabValue] = useState(0);
  const [genderFilter, setGenderFilter] = useState("all"); // 'all', 'M', 'F', 'unknown'
  const [overallData, setOverallData] = useState([]);
  const [stageData, setStageData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    setLoading(true);
    try {
      const overall = await fetchOverallLeaderboard();
      setOverallData(overall || []);

      // Load stage leaderboards for stages 1-3
      const stages = {};
      for (let stage = 1; stage <= 3; stage++) {
        const stageData = await fetchStageLeaderboard(stage);
        stages[stage] = stageData || [];
      }
      setStageData(stages);
    } catch (err) {
      console.error("Failed to load leaderboards", err);
    } finally {
      setLoading(false);
    }
  };

  const filterByGender = (data) => {
    if (genderFilter === "all") return data;
    if (genderFilter === "unknown") {
      return data.filter((row) => !row.sex || row.sex === null || row.sex === "");
    }
    return data.filter((row) => row.sex === genderFilter);
  };

  const formatTime = (seconds) => {
    if (!seconds) return "—";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getStageIcons = (stagesCompleted) => {
    const icons = [];
    for (let i = 1; i <= 3; i++) {
      icons.push(i <= stagesCompleted ? "✓" : "○");
    }
    return icons.join(" ");
  };

  const getTicketTypeIcon = (ticketType) => {
    const t = typeof ticketType === "string" ? ticketType.trim().toLowerCase() : "";
    if (t === "basic") return "⚪️";
    if (t === "premium") return "🟠";
    if (t === "apex") return "⚫️";
    return "";
  };

  const formatRunnerName = (fullName, ticketType) => {
    const name = fullName || "Unknown";
    const icon = getTicketTypeIcon(ticketType);
    return icon ? `${icon} ${name}` : name;
  };

  const filteredOverall = filterByGender(overallData).sort(
    (a, b) => (a.total_time_seconds || Infinity) - (b.total_time_seconds || Infinity)
  );

  const filteredStageData = {};
  Object.keys(stageData).forEach((stage) => {
    filteredStageData[stage] = filterByGender(stageData[stage])
      .sort((a, b) => (a.best_time_seconds || Infinity) - (b.best_time_seconds || Infinity))
      .map((row) => ({
        ...row,
        name: formatRunnerName(row.full_name, row.ticket_type),
        time: formatTime(row.best_time_seconds),
      }));
  });

  const overallRows = filteredOverall.map((row, idx) => ({
    ...row,
    rank: idx + 1,
    name: formatRunnerName(row.full_name, row.ticket_type),
    time: formatTime(row.total_time_seconds),
    stagesIcons: getStageIcons(row.stages_completed || 0),
  }));

  return (
    <>
      <AppHeader />

      <Container maxWidth="md">
        <Stack spacing={3} mt={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
              Leaderboards
            </Typography>

            <Tabs
              value={tabValue}
              onChange={(e, newValue) => setTabValue(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                mb: 2,
                "& .MuiTab-root": {
                  color: OUTRUN_WHITE,
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  minHeight: { xs: 42, sm: 48 },
                  px: { xs: 1, sm: 2 },
                },
                "& .MuiTab-root.Mui-selected": { color: OUTRUN_BLACK },
                "& .MuiTabs-indicator": { backgroundColor: OUTRUN_BLACK },
              }}
            >
              <Tab label="Overall" />
              <Tab label="Stage 1" />
              <Tab label="Stage 2" />
              <Tab label="Stage 3" />
            </Tabs>

            <Box sx={{ mb: 2 }}>
              <Tabs
                value={genderFilter}
                onChange={(e, newValue) => setGenderFilter(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  "& .MuiTab-root": {
                    color: OUTRUN_WHITE,
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    minHeight: { xs: 42, sm: 48 },
                    px: { xs: 1, sm: 2 },
                  },
                  "& .MuiTab-root.Mui-selected": { color: OUTRUN_BLACK },
                  "& .MuiTabs-indicator": { backgroundColor: OUTRUN_BLACK },
                }}
              >
                <Tab label="All" value="all" />
                <Tab label="Male" value="M" />
                <Tab label="Female" value="F" />
                <Tab label="Unknown" value="unknown" />
              </Tabs>
            </Box>

            {loading ? (
              <Typography>Loading...</Typography>
            ) : tabValue === 0 ? (
              <OverallLeaderboardTable rows={overallRows} />
            ) : (
              <StageLeaderboardTable
                rows={filteredStageData[String(tabValue)] || []}
                stageNumber={tabValue}
              />
            )}
          </Paper>
        </Stack>
      </Container>
    </>
  );
}
