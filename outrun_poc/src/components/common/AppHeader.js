// src/components/common/AppHeader.js
// Purpose: Global application header with OUTRUN branding

import { AppBar, Toolbar, Box } from "@mui/material";
import Image from "next/image";
import logo from "../../assets/name.png";

export default function AppHeader({ show = true }) {
  if (!show) return null;

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: "background.default",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "center",
          minHeight: 72,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Image
            src={logo}
            alt="OUTRUN"
            height={28}
            priority
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
