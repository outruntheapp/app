// src/components/common/AppHeader.js
// Purpose: Global application header with OUTRUN branding and navigation

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { AppBar, Toolbar, Box, Menu, MenuItem, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Image from "next/image";
import name from "../../assets/name.png";
import logo from "../../assets/logo.png";
import RulesDialog from "./RulesDialog";
import { fetchActiveChallenge } from "../../services/challengeService";
import { supabase } from "../../services/supabaseClient";
import { clearStoredEmail } from "../../services/authService";
import { isDemoMode, disableDemoMode } from "../../utils/demoMode";
import { getAdminUser } from "../../utils/adminAuth";

export default function AppHeader({ show = true, hideNav = false }) {
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const isLandingPage = router.pathname === "/";

  useEffect(() => {
    if (!isLandingPage) {
      loadChallenge();
    }
  }, [isLandingPage]);

  useEffect(() => {
    if (hideNav || isLandingPage) return;
    getAdminUser(supabase).then(({ isAdmin: admin }) => setIsAdmin(admin));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getAdminUser(supabase).then(({ isAdmin: admin }) => setIsAdmin(admin));
    });
    return () => subscription?.unsubscribe();
  }, [hideNav, isLandingPage]);

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

  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleNavClick = (path) => {
    handleMenuClose();
    router.push(path);
  };

  const handleRulesClick = () => {
    handleMenuClose();
    setRulesOpen(true);
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await supabase.auth.signOut({ scope: "local" });
      if (typeof window !== "undefined" && isDemoMode()) {
        await disableDemoMode();
      }
      clearStoredEmail();
      window.location.replace("/");
    } catch (err) {
      console.error("Logout failed", err);
      window.location.replace("/");
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

        {/* Hamburger menu - all screen sizes */}
        {!hideNav && !isLandingPage && (
          <Box sx={{ ml: "auto", zIndex: 1 }}>
            <IconButton
              color="inherit"
              onClick={handleMenuOpen}
              sx={{ color: "white" }}
              aria-label="Open menu"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
            >
              {isAdmin && (
                <MenuItem onClick={() => handleNavClick("/admin")} selected={router.pathname === "/admin"}>
                  Admin
                </MenuItem>
              )}
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
