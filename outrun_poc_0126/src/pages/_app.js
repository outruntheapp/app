// src/pages/_app.js
// Purpose: Global app wrapper (theme, providers)

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../styles/theme";
import splash from "../assets/splash.png";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Suppress CORS errors from third-party analytics (Strava, Google Analytics, etc.)
    // These are expected third-party calls and should not be treated as app errors
    
    // Intercept fetch requests to suppress CORS errors from third-party analytics
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0]?.toString() || '';
      // Check if this is a third-party analytics request
      if (
        (url.includes('gtm-strava') || url.includes('google-analytics') || url.includes('googletagmanager')) &&
        url.includes('strava.com')
      ) {
        // Suppress CORS errors for these requests
        return originalFetch.apply(this, args).catch((err) => {
          // Silently ignore CORS errors from third-party analytics
          return Promise.resolve(new Response(null, { status: 200 }));
        });
      }
      return originalFetch.apply(this, args);
    };
    
    const handleError = (event) => {
      const errorMessage = event.message || String(event.error || event);
      const source = event.filename || event.target?.src || '';

      // Check if this is a third-party analytics CORS error
      if (
        (errorMessage.includes("Access-Control-Allow-Origin") || source.includes("gtm-strava") || source.includes("google-analytics")) &&
        (errorMessage.includes("strava.com") ||
          errorMessage.includes("google-analytics") ||
          errorMessage.includes("googletagmanager") ||
          errorMessage.includes("googleapis.com") ||
          source.includes("strava.com"))
      ) {
        // Suppress the error - this is expected third-party analytics behavior
        event.preventDefault();
        return false;
      }
      
      // Allow other errors to propagate normally
      return true;
    };

    // Listen for unhandled errors
    window.addEventListener("error", handleError, true);
    
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
        return false;
      }

      return true;
    };
    
    window.addEventListener("unhandledrejection", handleRejection);

    // Cleanup
    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("error", handleError, true);
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
