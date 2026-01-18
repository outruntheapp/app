// src/pages/index.js
// Purpose: Landing / login page with OUTRUN branding

/* 
   Add button to Join Challenge (nav to ticket sales) - need to think how to use this to ensure only auth participants can link to Strava
   Add countdown to challenge start
   Add button to rules 
*/

import { Container, Stack, Typography } from "@mui/material";
import StravaConnectButton from "../components/auth/StravaConnectButton";
import Image from "next/image";
import AppHeader from "../components/common/AppHeader";
import name from "../assets/name.png";
import logo from "../assets/logo.png";

export default function LandingPage() {
  return (
    <>
      <AppHeader />

      <Container maxWidth="xs">
        <Stack spacing={4} mt={10} alignItems="center">
          <Image
            src={name}
            alt="OUTRUN_name"
            width={220}
            priority
          />
          <Image
            src={logo}
            alt="OUTRUN_logo"
            width={220}
            priority
          />

          <Typography variant="body2" align="center">
            Premium Virtual Running Challenge
          </Typography>

          <StravaConnectButton />
        </Stack>
      </Container>
    </>
  );
}
