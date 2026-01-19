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
    const handleError = (event) => {
      const errorMessage = event.message || String(event.error || event);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_app.js:15',message:'Error handler triggered',data:{errorMessage:errorMessage.substring(0,100),hasCors:errorMessage.includes("Access-Control-Allow-Origin"),hasStrava:errorMessage.includes("strava.com")},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4,H5'})}).catch(()=>{});
      // #endregion
      
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_app.js:25',message:'Suppressing CORS error',data:{errorMessage:errorMessage.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4,H5'})}).catch(()=>{});
        // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_app.js:37',message:'Rejection handler triggered',data:{errorMessage:errorMessage.substring(0,100),hasCors:errorMessage.includes("Access-Control-Allow-Origin")},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4,H5'})}).catch(()=>{});
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
        fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_app.js:47',message:'Suppressing CORS rejection',data:{errorMessage:errorMessage.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4,H5'})}).catch(()=>{});
        // #endregion
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
