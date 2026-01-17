// src/components/common/AppHeader.js
// Purpose: Global application header with OUTRUN branding

import { AppBar, Toolbar, Box } from "@mui/material";
import Image from "next/image";
import header from "../../assets/header.png";

export default function AppHeader({ show = true }) {
  if (!show) return null;

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: "transparent",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "center",
          minHeight: { xs: 80, sm: 100 },
          py: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", maxWidth: "100%" }}>
          <Image
            src={header}
            alt="OUTRUN"
            width={300}
            height={80}
            priority
            style={{
              width: "100%",
              maxWidth: "400px",
              height: "auto",
              objectFit: "contain",
            }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
