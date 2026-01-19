// src/components/common/AppHeader.js
// Purpose: Global application header with OUTRUN branding and navigation

import { useState } from "react";
import { useRouter } from "next/router";
import { AppBar, Toolbar, Box, Button, Menu, MenuItem, IconButton, useMediaQuery, useTheme } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Image from "next/image";
import Link from "next/link";
import header from "../../assets/header.png";

export default function AppHeader({ show = true, hideNav = false }) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const isLandingPage = router.pathname === "/";

  if (!show) return null;

  const navLinks = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Routes", path: "/routes" },
    { label: "Leaderboard", path: "/leaderboard" },
  ];

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleNavClick = (path) => {
    handleMobileMenuClose();
    router.push(path);
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: "transparent",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        width: "100vw",
        maxWidth: "100%",
        margin: 0,
        padding: 0,
        left: 0,
        right: 0,
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          minHeight: { xs: 80, sm: 100 },
          py: 1,
          width: "100%",
          maxWidth: "100%",
          px: { xs: 2, sm: 3 },
        }}
      >
        {/* Header Image - Centered */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            position: "absolute",
            left: 0,
            right: 0,
            pointerEvents: "none",
          }}
        >
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

        {/* Navigation Links - Right Side */}
        {!hideNav && !isLandingPage && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              ml: "auto",
              zIndex: 1,
            }}
          >
            {isMobile ? (
              <>
                <IconButton
                  color="inherit"
                  onClick={handleMobileMenuOpen}
                  sx={{ color: "white" }}
                >
                  <MenuIcon />
                </IconButton>
                <Menu
                  anchorEl={mobileMenuAnchor}
                  open={Boolean(mobileMenuAnchor)}
                  onClose={handleMobileMenuClose}
                >
                  {navLinks.map((link) => (
                    <MenuItem
                      key={link.path}
                      onClick={() => handleNavClick(link.path)}
                      selected={router.pathname === link.path}
                    >
                      {link.label}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            ) : (
              navLinks.map((link) => (
                <Button
                  key={link.path}
                  component={Link}
                  href={link.path}
                  color="inherit"
                  sx={{
                    color: "white",
                    textTransform: "none",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                    },
                  }}
                >
                  {link.label}
                </Button>
              ))
            )}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
