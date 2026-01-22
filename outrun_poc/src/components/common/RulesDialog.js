// src/components/common/RulesDialog.js
// Purpose: Display challenge rules and information

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
// Using native Date formatting instead of date-fns

// Rulebook content structure
const rulebookSections = [
  {
    id: 1,
    title: "THE MISSION",
    content: [
      "Complete all 3 stages of the challenge within the 21-day window.",
      "Stages can be completed in any order.",
      "Unlimited attempts are allowed — your best time for each stage will be recorded.",
      "Stage distances:",
      "• Stage 1: Approximately 5km",
      "• Stage 2: Approximately 10km",
      "• Stage 3: Approximately 15km",
    ],
  },
  {
    id: 2,
    title: "ROUTE COMPLIANCE",
    content: [
      "You must follow the official route as defined by the Strava/GPX route.",
      "Your activity must start and finish within the designated route boundaries.",
      "The activity must be a continuous effort — no breaks, pauses, or interruptions.",
      "Shortcuts, altered routes, or deviations from the official route will result in disqualification.",
      "Route matching is automated and requires ≥80% overlap with the official route.",
    ],
  },
  {
    id: 3,
    title: "ACTIVITY TRACKING & STRAVA REQUIREMENTS",
    content: [
      "You must use a GPS-enabled device to track your activities.",
      "Your Strava account must be linked to your OUTRUN profile.",
      "Activities must be set to public or visible to followers on Strava.",
      "Activities must include full GPS data (start/end points, route, distance, time).",
      "Activities must have both elapsed time and moving time recorded.",
      "Private activities, incomplete activities, or manually edited activities may be rejected.",
      "Only running activities will be counted — cycling, walking, or other activities will be ignored.",
    ],
  },
  {
    id: 4,
    title: "HEART RATE & PERFORMANCE VALIDATION",
    content: [
      "For podium contenders and top finishers, additional verification may be required:",
      "• Heart rate data may be requested for validation",
      "• Historical performance data may be reviewed",
      "• Strava activity details may be manually reviewed",
      "• Device verification may be required",
      "Unrealistic performance patterns, suspicious data, or inconsistencies may lead to review or disqualification.",
    ],
  },
  {
    id: 5,
    title: "FAIR PLAY & CHEATING POLICY",
    content: [
      "The following activities are strictly prohibited:",
      "• Using any form of vehicle (car, bike, scooter, etc.)",
      "• Pausing activities during the run",
      "• Editing or manipulating GPS data, times, or distances",
      "• Using another person's account or activities",
      "• Treadmill activities or indoor runs",
      "• Sharing accounts or allowing others to run on your behalf",
      "Any form of manipulation, cheating, or violation of these rules will result in:",
      "• Immediate removal from the leaderboard",
      "• Loss of eligibility for prizes",
      "• Possible permanent ban from future OUTRUN challenges",
    ],
  },
  {
    id: 6,
    title: "LEADERBOARD & RANKINGS",
    content: [
      "Leaderboards reflect:",
      "• Overall rankings (combined time across all stages)",
      "• Per-stage rankings (best time for each individual stage)",
      "• Gender-based categories (where applicable)",
      "• Age-based categories (where applicable)",
      "Rankings are provisional until verified.",
      "Leaderboards are updated automatically as activities are processed and validated.",
    ],
  },
  {
    id: 7,
    title: "PRIZES & RECOGNITION",
    content: [
      "Eligibility for prizes requires:",
      "• Completion of all stages within the challenge period",
      "• Verification of all activities",
      "• Compliance with all rules and fair play policies",
      "• Participation in Premium or Apex categories (where applicable)",
      "Additional data or participation in verification ceremonies may be required for prize eligibility.",
    ],
  },
  {
    id: 8,
    title: "MEDALS & FINISHER STATUS",
    content: [
      "Medals and finisher status are awarded to participants who:",
      "• Complete all 3 stages within the challenge period",
      "• Follow all route compliance rules",
      "• Pass automated and manual verification processes",
      "• Maintain fair play standards throughout the challenge",
    ],
  },
  {
    id: 9,
    title: "SAFETY & RESPONSIBILITY",
    content: [
      "Participants run at their own risk.",
      "You are responsible for:",
      "• Choosing appropriate times and conditions for your runs",
      "• Monitoring weather and environmental conditions",
      "• Carrying necessary safety equipment",
      "• Obeying all local laws and regulations",
      "• Ensuring your own safety and the safety of others",
      "OUTRUN is not responsible for any injuries, accidents, or incidents that occur during participation.",
    ],
  },
  {
    id: 10,
    title: "FINAL AUTHORITY",
    content: [
      "OUTRUN reserves the right to:",
      "• Amend or modify these rules at any time",
      "• Disqualify participants who violate rules or fair play policies",
      "• Withhold prizes from participants who do not meet eligibility requirements",
      "• Modify leaderboards based on verification results",
      "• Interpret and enforce these rules as deemed appropriate",
      "All decisions made by OUTRUN are final and binding.",
    ],
  },
];

export default function RulesDialog({ open, onClose, challenge }) {
  if (!challenge) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>THE OUTRUN RULEBOOK</DialogTitle>
      <DialogContent
        dividers
        sx={{
          maxHeight: "70vh",
          overflow: "auto",
          px: 2,
        }}
      >
        {/* Challenge Info Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {challenge.name || "Active Challenge"}
          </Typography>
          
          <Box sx={{ mb: 2, mt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Start Date
            </Typography>
            <Typography variant="body2">{formatDate(challenge.starts_at)}</Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              End Date
            </Typography>
            <Typography variant="body2">{formatDate(challenge.ends_at)}</Typography>
          </Box>

          <Typography
            variant="body2"
            sx={{
              fontStyle: "italic",
              color: "text.secondary",
              mt: 2,
              textAlign: "center",
            }}
          >
            Run with integrity. Compete with honour. Earn your mark.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Rulebook Sections */}
        {rulebookSections.map((section, index) => (
          <Box key={section.id} sx={{ mb: index < rulebookSections.length - 1 ? 3 : 0 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              {section.id}. {section.title}
            </Typography>
            <List dense sx={{ pl: 0 }}>
              {section.content.map((item, itemIndex) => {
                const isBulletPoint = item.startsWith("•");
                const text = isBulletPoint ? item.substring(1).trim() : item;
                return (
                  <ListItem key={itemIndex} sx={{ pl: isBulletPoint ? 2 : 0, py: 0.5 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="text.primary">
                          {isBulletPoint && "• "}
                          {text}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
            {index < rulebookSections.length - 1 && <Divider sx={{ mt: 2 }} />}
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
