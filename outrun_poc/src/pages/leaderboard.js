// src/pages/leaderboard.js
// Purpose: Public leaderboard page

import { Container, Stack } from "@mui/material";
import AppHeader from "../components/common/AppHeader";
import OverallLeaderboardTable from "../components/leaderboard/OverallLeaderboardTable";

export default function LeaderboardPage() {
  return (
    <>
      <AppHeader />

      <Container maxWidth="md">
        <Stack mt={3}>
          <OverallLeaderboardTable rows={[]} />
        </Stack>
      </Container>
    </>
  );
}
