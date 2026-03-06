/**
 * Structured Logging System
 */

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

export interface LogContext {
  userId?: string;
  conversationId?: string;
  sessionId?: string;
  requestId?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private static contextStack: LogContext[] = [];

  /**
   * Push context for tracking
   */
  static pushContext(context: Partial<LogContext>) {
    this.contextStack.push({
      ...this.contextStack[this.contextStack.length - 1],
      ...context,
    });
  }

  /**
   * Pop context
   */
  static popContext() {
    this.contextStack.pop();
  }

  /**
   * Get current context
   */
  private static getCurrentContext(): LogContext | undefined {
    return this.contextStack[this.contextStack.length - 1];
  }

  /**
   * Format log entry
   */
  private static formatEntry(
    level: LogLevel,
    module: string,
    message: string,
    error?: Error,
    additionalContext?: LogContext,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      context: {
        ...this.getCurrentContext(),
        ...additionalContext,
      },
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };
  }

  /**
   * Output log
   */
  private static output(entry: LogEntry) {
    const output = {
      ...entry,
      context: entry.context || {},
    };

    const logFn = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.log,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
      [LogLevel.FATAL]: console.error,
    }[entry.level];

    logFn(
      `[${entry.timestamp}] [${entry.module}] [${entry.level.toUpperCase()}] ${entry.message}`,
      output,
    );
  }

  /**
   * Log debug
   */
  static debug(module: string, message: string, context?: LogContext) {
    const entry = this.formatEntry(
      LogLevel.DEBUG,
      module,
      message,
      undefined,
      context,
    );
    this.output(entry);
  }

  /**
   * Log info
   */
  static info(module: string, message: string, context?: LogContext) {
    const entry = this.formatEntry(
      LogLevel.INFO,
      module,
      message,
      undefined,
      context,
    );
    this.output(entry);
  }

  /**
   * Log warning
   */
  static warn(module: string, message: string, context?: LogContext) {
    const entry = this.formatEntry(
      LogLevel.WARN,
      module,
      message,
      undefined,
      context,
    );
    this.output(entry);
  }

  /**
   * Log error
   */
  static error(
    module: string,
    message: string,
    error?: Error,
    context?: LogContext,
  ) {
    const entry = this.formatEntry(
      LogLevel.ERROR,
      module,
      message,
      error,
      context,
    );
    this.output(entry);
  }

  /**
   * Log fatal
   */
  static fatal(
    module: string,
    message: string,
    error: Error,
    context?: LogContext,
  ) {
    const entry = this.formatEntry(
      LogLevel.FATAL,
      module,
      message,
      error,
      context,
    );
    this.output(entry);
  }
}

export default Logger;
