type LogLevel = "info" | "warn" | "error";

/**
 * Writes structured messages through a small app-wide logger facade.
 */
function emit(level: LogLevel, scope: string, message: string, details?: unknown): void {
  const payload = {
    scope,
    message,
    details,
    timestamp: new Date().toISOString(),
  };

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}

/**
 * Creates a logger that automatically stamps all messages with a scope label.
 */
export function createScopedLogger(scope: string) {
  return {
    /**
     * Writes an informational message.
     */
    info(message: string, details?: unknown): void {
      emit("info", scope, message, details);
    },

    /**
     * Writes a warning message.
     */
    warn(message: string, details?: unknown): void {
      emit("warn", scope, message, details);
    },

    /**
     * Writes an error message.
     */
    error(message: string, details?: unknown): void {
      emit("error", scope, message, details);
    },
  };
}
