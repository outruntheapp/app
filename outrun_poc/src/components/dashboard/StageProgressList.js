// src/components/dashboard/StageProgressList.js
// Purpose: Show stage completion progress

import { useState, useEffect } from "react";
import {
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Typography,
  Chip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { fetchCurrentUser } from "../../services/userService";
import { fetchActiveChallenge } from "../../services/challengeService";
import { fetchUserStageResults } from "../../services/userService";
import { formatDuration } from "../../utils/time";
import LoadingState from "../common/LoadingState";

export default function StageProgressList() {
  const [user, setUser] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [stageResults, setStageResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, challengeData] = await Promise.all([
        fetchCurrentUser(),
        fetchActiveChallenge(),
      ]);
      setUser(userData);
      setChallenge(challengeData);

      if (userData && challengeData) {
        const results = await fetchUserStageResults(userData.id, challengeData.id);
        setStageResults(results);
      }
    } catch (err) {
      console.error("Failed to load stage progress", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  const getStageStatus = (stageNumber) => {
    const result = stageResults.find((r) => r.stage_number === stageNumber);
    return result
      ? {
          completed: true,
          time: result.best_time_seconds,
          date: result.completed_at,
        }
      : { completed: false, time: null, date: null };
  };

  const formatTime = (seconds) => {
    if (!seconds) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const completedStages = stageResults.length;

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Stage Progress</Typography>
        <Chip
          label={`${completedStages}/3 completed`}
          color={completedStages === 3 ? "success" : "default"}
          size="small"
        />
      </Box>
      <List>
        {[1, 2, 3].map((stageNum) => {
          const status = getStageStatus(stageNum);
          return (
            <ListItem
              key={stageNum}
              sx={{
                borderLeft: status.completed ? "3px solid" : "3px solid transparent",
                borderColor: status.completed ? "success.main" : "transparent",
                mb: 1,
                bgcolor: status.completed ? "rgba(76, 175, 80, 0.1)" : "transparent",
                borderRadius: 1,
              }}
            >
              <ListItemIcon>
                {status.completed ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <RadioButtonUncheckedIcon color="disabled" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={`Stage ${stageNum}`}
                secondary={
                  status.completed
                    ? `Completed in ${formatTime(status.time)} • ${new Date(
                        status.date
                      ).toLocaleDateString()}`
                    : "Not completed"
                }
              />
              {status.completed && (
                <Chip label={formatTime(status.time)} size="small" color="success" />
              )}
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}
