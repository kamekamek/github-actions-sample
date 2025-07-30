const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');
const { expandTilde, ensureDirectory } = require('./helpers');

class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.enableFile = options.enableFile !== false;
    this.filePath = options.filePath || '~/.claude-monitor/logs/monitor.log';
    this.maxFiles = options.maxFiles || 5;
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
    this.enableConsole = options.enableConsole !== false;
    
    // Log levels
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    // Initialize file logging
    if (this.enableFile) {
      this.initializeFileLogging();
    }
  }

  async initializeFileLogging() {
    try {
      const expandedPath = expandTilde(this.filePath);
      const logDir = path.dirname(expandedPath);
      await ensureDirectory(logDir);
      this.filePath = expandedPath;
    } catch (error) {
      console.error('Failed to initialize file logging:', error.message);
      this.enableFile = false;
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    const fullMessage = `${message} ${formattedArgs}`.trim();
    
    return {
      console: this.formatConsoleMessage(level, timestamp, fullMessage),
      file: this.formatFileMessage(level, timestamp, fullMessage)
    };
  }

  formatConsoleMessage(level, timestamp, message) {
    const time = chalk.gray(timestamp.split('T')[1].split('.')[0]);
    const levelColors = {
      error: chalk.red.bold,
      warn: chalk.yellow,
      info: chalk.blue,
      debug: chalk.gray
    };
    
    const coloredLevel = levelColors[level](`[${level.toUpperCase()}]`);
    return `${time} ${coloredLevel} ${message}`;
  }

  formatFileMessage(level, timestamp, message) {
    return `${timestamp} [${level.toUpperCase()}] ${message}`;
  }

  async writeToFile(message) {
    if (!this.enableFile) return;
    
    try {
      // Check file size and rotate if necessary
      await this.rotateLogIfNeeded();
      
      // Append to log file
      await fs.appendFile(this.filePath, message + '\n');
    } catch (error) {
      // Silently fail to avoid infinite loops
      console.error('Failed to write to log file:', error.message);
    }
  }

  async rotateLogIfNeeded() {
    try {
      const stats = await fs.stat(this.filePath);
      
      if (stats.size > this.maxSize) {
        await this.rotateLogs();
      }
    } catch (error) {
      // File doesn't exist yet, no rotation needed
    }
  }

  async rotateLogs() {
    const basePath = this.filePath;
    const ext = path.extname(basePath);
    const nameWithoutExt = basePath.slice(0, -ext.length);
    
    try {
      // Rotate existing files
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = `${nameWithoutExt}.${i}${ext}`;
        const newFile = `${nameWithoutExt}.${i + 1}${ext}`;
        
        try {
          await fs.rename(oldFile, newFile);
        } catch {
          // File doesn't exist, continue
        }
      }
      
      // Move current log to .1
      await fs.rename(basePath, `${nameWithoutExt}.1${ext}`);
      
      // Remove oldest log if it exceeds maxFiles
      const oldestFile = `${nameWithoutExt}.${this.maxFiles + 1}${ext}`;
      try {
        await fs.unlink(oldestFile);
      } catch {
        // File doesn't exist, that's fine
      }
      
    } catch (error) {
      console.error('Failed to rotate logs:', error.message);
    }
  }

  async log(level, message, ...args) {
    if (!this.shouldLog(level)) return;
    
    const formatted = this.formatMessage(level, message, ...args);
    
    // Console output
    if (this.enableConsole) {
      console.log(formatted.console);
    }
    
    // File output
    if (this.enableFile) {
      await this.writeToFile(formatted.file);
    }
  }

  error(message, ...args) {
    return this.log('error', message, ...args);
  }

  warn(message, ...args) {
    return this.log('warn', message, ...args);
  }

  info(message, ...args) {
    return this.log('info', message, ...args);
  }

  debug(message, ...args) {
    return this.log('debug', message, ...args);
  }

  // Convenience methods for structured logging
  logError(error, context = {}) {
    this.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  }

  logPerformance(operation, duration, context = {}) {
    this.info('Performance metric:', {
      operation,
      duration: `${duration}ms`,
      ...context
    });
  }

  logActivity(activity, details = {}) {
    this.info('Activity:', {
      activity,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Create child logger with context
  child(context = {}) {
    const childLogger = new Logger({
      level: this.level,
      enableFile: this.enableFile,
      filePath: this.filePath,
      maxFiles: this.maxFiles,
      maxSize: this.maxSize,
      enableConsole: this.enableConsole
    });
    
    // Override log method to include context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level, message, ...args) => {
      const contextStr = Object.keys(context).length > 0 
        ? `[${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(',')}]`
        : '';
      
      return originalLog(level, `${contextStr} ${message}`, ...args);
    };
    
    return childLogger;
  }
}

module.exports = Logger;