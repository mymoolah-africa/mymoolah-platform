// Centralized logging service for MyMoolah platform
// Provides consistent logging across all components with environment-based configuration

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  error?: Error;
  metadata?: Record<string, any>;
}

class LoggingService {
  private isDevelopment = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');
  private isProduction = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
  
  // Log levels that should be shown in current environment
  private getVisibleLevels(): LogLevel[] {
    if (this.isDevelopment) {
      return [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    }
    if (this.isProduction) {
      return [LogLevel.WARN, LogLevel.ERROR];
    }
    return [LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.getVisibleLevels().includes(level);
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const component = entry.component.padEnd(20);
    
    let message = `[${timestamp}] ${level} [${component}] ${entry.message}`;
    
    if (entry.error) {
      message += `\nError: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\nStack: ${entry.error.stack}`;
      }
    }
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += `\nMetadata: ${JSON.stringify(entry.metadata, null, 2)}`;
    }
    
    return message;
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formattedMessage = this.formatMessage(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  private logToStorage(entry: LogEntry): void {
    // In production, you might want to send logs to a logging service
    // For now, we'll just store them in localStorage for debugging
    if (this.isDevelopment) {
      try {
        const existingLogs = JSON.parse(localStorage.getItem('mymoolah_logs') || '[]');
        const updatedLogs = [...existingLogs, entry].slice(-100); // Keep last 100 logs
        localStorage.setItem('mymoolah_logs', JSON.stringify(updatedLogs));
      } catch (error) {
        // Silently fail if localStorage is not available
      }
    }
  }

  debug(component: string, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      component,
      message,
      metadata
    };
    
    this.logToConsole(entry);
    this.logToStorage(entry);
  }

  info(component: string, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      component,
      message,
      metadata
    };
    
    this.logToConsole(entry);
    this.logToStorage(entry);
  }

  warn(component: string, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      component,
      message,
      metadata
    };
    
    this.logToConsole(entry);
    this.logToStorage(entry);
  }

  error(component: string, message: string, error?: Error, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      component,
      message,
      error,
      metadata
    };
    
    this.logToConsole(entry);
    this.logToStorage(entry);
  }

  // Convenience method for logging errors with context
  logError(component: string, context: string, error: Error, metadata?: Record<string, any>): void {
    this.error(component, `${context}: ${error.message}`, error, metadata);
  }

  // Get stored logs for debugging
  getStoredLogs(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('mymoolah_logs') || '[]');
    } catch {
      return [];
    }
  }

  // Clear stored logs
  clearStoredLogs(): void {
    try {
      localStorage.removeItem('mymoolah_logs');
    } catch {
      // Silently fail if localStorage is not available
    }
  }
}

// Export singleton instance
export const loggingService = new LoggingService();

// Export convenience functions
export const logDebug = (component: string, message: string, metadata?: Record<string, any>) => 
  loggingService.debug(component, message, metadata);

export const logInfo = (component: string, message: string, metadata?: Record<string, any>) => 
  loggingService.info(component, message, metadata);

export const logWarn = (component: string, message: string, metadata?: Record<string, any>) => 
  loggingService.warn(component, message, metadata);

export const logError = (component: string, message: string, error?: Error, metadata?: Record<string, any>) => 
  loggingService.error(component, message, error, metadata);

export const logErrorWithContext = (component: string, context: string, error: Error, metadata?: Record<string, any>) => 
  loggingService.logError(component, context, error, metadata);

export default loggingService;
