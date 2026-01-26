// src/components/common/AppHeader.js
// Purpose: Global application header with OUTRUN branding and navigation

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { AppBar, Toolbar, Box, Button, Menu, MenuItem, IconButton, useMediaQuery, useTheme } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Image from "next/image";
import Link from "next/link";
import name from "../../assets/name.png";
import logo from "../../assets/logo.png";
import RulesDialog from "./RulesDialog";
import { fetchActiveChallenge } from "../../services/challengeService";
import { supabase } from "../../services/supabaseClient";
import { isDemoMode, disableDemoMode } from "../../utils/demoMode";

export default function AppHeader({ show = true, hideNav = false }) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const isLandingPage = router.pathname === "/";

  useEffect(() => {
    if (!isLandingPage) {
      loadChallenge();
    }
  }, [isLandingPage]);

  const loadChallenge = async () => {
    try {
      const challengeData = await fetchActiveChallenge();
      setChallenge(challengeData);
    } catch (err) {
      console.error("Failed to load challenge data", err);
    }
  };

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

  const handleRulesClick = () => {
    handleMobileMenuClose();
    setRulesOpen(true);
  };

  const handleLogout = async () => {
    handleMobileMenuClose();
    try {
      await supabase.auth.signOut();
      if (typeof window !== "undefined" && isDemoMode()) {
        await disableDemoMode();
      }
      router.push("/");
    } catch (err) {
      console.error("Logout failed", err);
      router.push("/");
    }
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
        {/* Name and Logo - Centered, stacked vertically */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            position: "absolute",
            left: 0,
            right: 0,
            pointerEvents: "none",
            gap: 0,
            "& > span": {
              display: "block !important",
              margin: "0 !important",
              padding: "0 !important",
              lineHeight: 0,
            },
            "& > span > img": {
              display: "block !important",
              margin: "0 !important",
              padding: "0 !important",
            },
          }}
        >
          <Image
            src={name}
            alt="OUTRUN_name"
            width={110}
            priority
          />
          <Image
            src={logo}
            alt="OUTRUN_logo"
            width={110}
            priority
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
                  <MenuItem onClick={handleRulesClick}>Rules</MenuItem>
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </>
            ) : (
              <>
                {navLinks.map((link) => (
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
                ))}
                <Button
                  color="inherit"
                  onClick={handleRulesClick}
                  sx={{
                    color: "white",
                    textTransform: "none",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                    },
                  }}
                >
                  Rules
                </Button>
                <Button
                  color="inherit"
                  onClick={handleLogout}
                  sx={{
                    color: "white",
                    textTransform: "none",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                    },
                  }}
                >
                  Logout
                </Button>
              </>
            )}
          </Box>
        )}
      </Toolbar>

      <RulesDialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        challenge={challenge}
      />
    </AppBar>
  );
}
