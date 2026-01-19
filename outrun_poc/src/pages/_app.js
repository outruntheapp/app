// src/pages/_app.js
// Purpose: Global app wrapper (theme, providers)

import { useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../styles/theme";
import splash from "../assets/splash.png";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Suppress CORS errors from third-party analytics (Strava, Google Analytics, etc.)
    // These are expected third-party calls and should not be treated as app errors
    const handleError = (event) => {
      const errorMessage = event.message || String(event.error || event);
      
      // Check if this is a third-party analytics CORS error
      if (
        errorMessage.includes("Access-Control-Allow-Origin") &&
        (errorMessage.includes("strava.com") ||
          errorMessage.includes("google-analytics") ||
          errorMessage.includes("googletagmanager") ||
          errorMessage.includes("googleapis.com"))
      ) {
        // Suppress the error - this is expected third-party analytics behavior
        event.preventDefault();
        console.warn("Suppressed third-party analytics CORS error:", errorMessage);
        return false;
      }
      
      // Allow other errors to propagate normally
      return true;
    };

    // Listen for unhandled errors
    window.addEventListener("error", handleError);
    
    // Listen for unhandled promise rejections
    const handleRejection = (event) => {
      const errorMessage = event.reason?.message || String(event.reason || event);
      
      if (
        errorMessage.includes("Access-Control-Allow-Origin") &&
        (errorMessage.includes("strava.com") ||
          errorMessage.includes("google-analytics") ||
          errorMessage.includes("googletagmanager") ||
          errorMessage.includes("googleapis.com"))
      ) {
        event.preventDefault();
        console.warn("Suppressed third-party analytics CORS error:", errorMessage);
        return false;
      }
      
      return true;
    };
    
    window.addEventListener("unhandledrejection", handleRejection);

    // Cleanup
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div
        style={{
          backgroundImage: `url(${splash.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  );
}
