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
    <Paper sx={{ p: 1.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
          Stage Progress
        </Typography>
        <Chip
          label={`${completedStages}/3`}
          color={completedStages === 3 ? "success" : "default"}
          size="small"
          sx={{ fontSize: "0.7rem", height: "20px" }}
        />
      </Box>
      <List sx={{ py: 0 }}>
        {[1, 2, 3].map((stageNum) => {
          const status = getStageStatus(stageNum);
          return (
            <ListItem
              key={stageNum}
              sx={{
                borderLeft: status.completed ? "2px solid" : "2px solid transparent",
                borderColor: status.completed ? "success.main" : "transparent",
                mb: 0.5,
                py: 0.75,
                px: 1,
                bgcolor: status.completed ? "rgba(76, 175, 80, 0.1)" : "transparent",
                borderRadius: 1,
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {status.completed ? (
                  <CheckCircleIcon color="success" sx={{ fontSize: "1.2rem" }} />
                ) : (
                  <RadioButtonUncheckedIcon color="disabled" sx={{ fontSize: "1.2rem" }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                    Stage {stageNum}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                    {status.completed
                      ? `${formatTime(status.time)} • ${new Date(status.date).toLocaleDateString()}`
                      : "Not completed"}
                  </Typography>
                }
                sx={{ "& .MuiListItemText-secondary": { mt: 0.25 } }}
              />
              {status.completed && (
                <Chip
                  label={formatTime(status.time)}
                  size="small"
                  color="success"
                  sx={{ fontSize: "0.65rem", height: "20px", ml: 1 }}
                />
              )}
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}
