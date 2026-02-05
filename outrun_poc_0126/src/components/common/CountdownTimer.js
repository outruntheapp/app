// src/components/common/CountdownTimer.js
// Purpose: Display countdown to challenge start

import { useState, useEffect } from "react";
import { Typography, Box } from "@mui/material";

export default function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!targetDate) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        expired: false,
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  if (timeLeft.expired) {
    return (
      <Typography variant="h6" align="center" color="primary" sx={{ fontWeight: 600 }}>
        Challenge has started!
      </Typography>
    );
  }

  return (
    <Box sx={{ textAlign: "center", my: 2 }}>
      <Typography variant="body2" sx={{ mb: 1, opacity: 0.8 }}>
        Challenge starts in:
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {timeLeft.days > 0 && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {timeLeft.days}
            </Typography>
            <Typography variant="caption">days</Typography>
          </Box>
        )}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {String(timeLeft.hours).padStart(2, "0")}
          </Typography>
          <Typography variant="caption">hours</Typography>
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {String(timeLeft.minutes).padStart(2, "0")}
          </Typography>
          <Typography variant="caption">minutes</Typography>
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {String(timeLeft.seconds).padStart(2, "0")}
          </Typography>
          <Typography variant="caption">seconds</Typography>
        </Box>
      </Box>
    </Box>
  );
}
