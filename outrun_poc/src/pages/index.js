// src/pages/index.js
// Purpose: Landing / login page with OUTRUN branding

import { Container, Stack, Typography } from "@mui/material";
import StravaConnectButton from "../components/auth/StravaConnectButton";
import Image from "next/image";
import logo from "../assets/name.png";

export default function LandingPage() {
  return (
    <Container maxWidth="xs">
      <Stack spacing={4} mt={10} alignItems="center">
        <Image
          src={logo}
          alt="OUTRUN"
          width={220}
          priority
        />

        <Typography variant="body2" align="center">
          Premium Virtual Running Challenge
        </Typography>

        <StravaConnectButton />
      </Stack>
    </Container>
  );
}
