// src/utils/logger.js
// Purpose: Centralized logging utility for dev + production parity

export function logDebug(message, data = {}) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[DEBUG]", message, data);
    }
  }
  
  export function logInfo(message, data = {}) {
    console.log("[INFO]", message, data);
  }
  
  export function logError(message, error) {
    console.error("[ERROR]", message, error);
  }
  