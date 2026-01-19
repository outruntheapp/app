// src/pages/_app.js
// Purpose: Global app wrapper (theme, providers)

import { useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../styles/theme";
import splash from "../assets/splash.png";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_app.js:10',message:'Setting up error handlers',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4,H5'})}).catch(()=>{});
    // #endregion
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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_app.js:20',message:'Suppressing analytics fetch error',data:{url:url.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4,H5'})}).catch(()=>{});
          // #endregion
          // Silently ignore CORS errors from third-party analytics
          return Promise.resolve(new Response(null, { status: 200 }));
        });
      }
      return originalFetch.apply(this, args);
    };
    
    const handleError = (event) => {
      const errorMessage = event.message || String(event.error || event);
      const source = event.filename || event.target?.src || '';
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_app.js:30',message:'Error handler triggered',data:{errorMessage:errorMessage.substring(0,100),source:source.substring(0,100),hasCors:errorMessage.includes("Access-Control-Allow-Origin"),hasStrava:errorMessage.includes("strava.com")},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4,H5'})}).catch(()=>{});
      // #endregion
      
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_app.js:40',message:'Suppressing CORS error',data:{errorMessage:errorMessage.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4,H5'})}).catch(()=>{});
        // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_app.js:52',message:'Rejection handler triggered',data:{errorMessage:errorMessage.substring(0,100),hasCors:errorMessage.includes("Access-Control-Allow-Origin")},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4,H5'})}).catch(()=>{});
      // #endregion
      
      if (
        errorMessage.includes("Access-Control-Allow-Origin") &&
        (errorMessage.includes("strava.com") ||
          errorMessage.includes("google-analytics") ||
          errorMessage.includes("googletagmanager") ||
          errorMessage.includes("googleapis.com"))
      ) {
        event.preventDefault();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_app.js:62',message:'Suppressing CORS rejection',data:{errorMessage:errorMessage.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4,H5'})}).catch(()=>{});
        // #endregion
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
