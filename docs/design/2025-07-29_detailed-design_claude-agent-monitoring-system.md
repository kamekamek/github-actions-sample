# Claude Agent Monitor CLI - 詳細設計書

**プロジェクト名**: Claude Agent Monitor CLI  
**バージョン**: 1.0.0  
**作成日**: 2025-07-29  
**作成者**: AI Virtual Corporation Development Team  
**承認者**: CTO, Security Specialist, CEO  

## 1. 実装詳細概要

### 1.1 プロジェクト構成
```
claude-agent-monitor/
├── bin/
│   └── claude-monitor.js           # CLI エントリポイント
├── src/
│   ├── cli/                        # CLI レイヤー
│   │   ├── commander.js            # コマンド処理
│   │   ├── output.js               # 出力フォーマット
│   │   └── config.js               # 設定管理
│   ├── monitor/                    # 監視エンジン
│   │   ├── engine.js               # メイン監視エンジン
│   │   └── watcher.js              # ファイル監視
│   ├── parser/                     # ログ解析
│   │   ├── logParser.js            # JSONLパーサー
│   │   ├── agentDetector.js        # エージェント検出
│   │   └── sessionAnalyzer.js      # セッション分析
│   ├── data/                       # データ管理
│   │   ├── memoryStore.js          # インメモリストア
│   │   ├── fileStore.js            # ファイルストア
│   │   └── models/                 # データモデル
│   │       ├── Session.js
│   │       ├── Agent.js
│   │       └── Metrics.js
│   ├── analysis/                   # 分析エンジン
│   │   ├── analyzer.js             # 統計分析
│   │   ├── predictor.js            # 予測エンジン
│   │   └── alertManager.js         # アラート管理
│   ├── web/                        # Webダッシュボード
│   │   ├── server.js               # Express サーバー
│   │   ├── routes/                 # API ルート
│   │   │   ├── api.js
│   │   │   ├── sessions.js
│   │   │   ├── agents.js
│   │   │   └── metrics.js
│   │   └── public/                 # 静的ファイル
│   │       ├── index.html
│   │       ├── css/
│   │       ├── js/
│   │       └── assets/
│   ├── utils/                      # ユーティリティ
│   │   ├── logger.js               # ログ出力
│   │   ├── crypto.js               # 暗号化
│   │   └── helpers.js              # ヘルパー関数
│   └── security/                   # セキュリティ
│       ├── auth.js                 # 認証
│       ├── sanitizer.js            # データサニタイザー
│       └── validator.js            # バリデーション
├── config/                         # 設定ファイル
│   ├── default.json
│   ├── development.json
│   └── production.json
├── tests/                          # テストファイル
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                           # ドキュメント
├── package.json
├── README.md
└── .env.example
```

## 2. コア実装詳細

### 2.1 CLI Entry Point (`bin/claude-monitor.js`)

```javascript
#!/usr/bin/env node

const { Command } = require('commander');
const CLICommander = require('../src/cli/commander');
const CLIOutput = require('../src/cli/output');
const Config = require('../src/cli/config');

const program = new Command();
const cli = new CLICommander();
const output = new CLIOutput();

// Global options
program
  .name('claude-monitor')
  .description('Claude Code Agent Monitoring CLI')
  .version('1.0.0')
  .option('-c, --config <path>', 'configuration file path')
  .option('-v, --verbose', 'verbose output')
  .option('--no-color', 'disable colored output');

// Monitor commands
program
  .command('monitor')
  .alias('m')
  .description('Monitor Claude Code sessions')
  .option('-d, --daemon', 'run as daemon')
  .option('-p, --port <number>', 'dashboard port', '3333')
  .action(async (options) => {
    try {
      await cli.startMonitoring(options);
    } catch (error) {
      output.error(`Failed to start monitoring: ${error.message}`);
      process.exit(1);
    }
  });

// Dashboard commands
program
  .command('dashboard')
  .alias('d')
  .description('Start web dashboard')
  .option('-p, --port <number>', 'port number', '3333')
  .option('--host <string>', 'host address', 'localhost')
  .action(async (options) => {
    try {
      await cli.startDashboard(options);
    } catch (error) {
      output.error(`Failed to start dashboard: ${error.message}`);
      process.exit(1);
    }
  });

// Status commands
program
  .command('status')
  .alias('s')
  .description('Show monitoring status')
  .action(async () => {
    try {
      const status = await cli.getStatus();
      output.displayStatus(status);
    } catch (error) {
      output.error(`Failed to get status: ${error.message}`);
      process.exit(1);
    }
  });

// Report commands
program
  .command('report')
  .alias('r')
  .description('Generate reports')
  .option('-t, --type <type>', 'report type', 'summary')
  .option('-p, --period <period>', 'time period', 'day')
  .option('-o, --output <path>', 'output file path')
  .action(async (options) => {
    try {
      await cli.generateReport(options);
    } catch (error) {
      output.error(`Failed to generate report: ${error.message}`);
      process.exit(1);
    }
  });

// Configuration commands
program
  .command('config')
  .alias('c')
  .description('Manage configuration')
  .option('--set <key=value>', 'set configuration value')
  .option('--get <key>', 'get configuration value')
  .option('--list', 'list all configurations')
  .action(async (options) => {
    try {
      await cli.manageConfig(options);
    } catch (error) {
      output.error(`Configuration error: ${error.message}`);
      process.exit(1);
    }
  });

// Error handling
program.on('command:*', () => {
  output.error('Invalid command. Use --help for available commands.');
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
```

### 2.2 CLI Commander (`src/cli/commander.js`)

```javascript
const path = require('path');
const MonitorEngine = require('../monitor/engine');
const WebServer = require('../web/server');
const Config = require('./config');
const CLIOutput = require('./output');
const Logger = require('../utils/logger');

class CLICommander {
  constructor() {
    this.config = new Config();
    this.output = new CLIOutput();
    this.logger = new Logger();
    this.monitorEngine = null;
    this.webServer = null;
  }

  async startMonitoring(options) {
    this.output.info('Starting Claude Code monitoring...');
    
    // Load configuration
    await this.config.load(options.config);
    
    // Initialize monitor engine
    this.monitorEngine = new MonitorEngine(this.config.get());
    
    // Start monitoring
    await this.monitorEngine.start();
    
    // Start dashboard if requested
    if (!options.daemon && options.port) {
      await this.startDashboard({ port: options.port });
    }
    
    this.output.success('Monitoring started successfully');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      this.output.info('Shutting down...');
      await this.shutdown();
      process.exit(0);
    });
    
    // Keep process alive
    if (options.daemon) {
      this.output.info('Running in daemon mode. Use Ctrl+C to stop.');
      await this.waitForever();
    }
  }

  async startDashboard(options) {
    this.output.info(`Starting dashboard on port ${options.port}...`);
    
    this.webServer = new WebServer({
      port: options.port,
      host: options.host || 'localhost',
      monitorEngine: this.monitorEngine
    });
    
    await this.webServer.start();
    
    this.output.success(`Dashboard available at http://${options.host || 'localhost'}:${options.port}`);
  }

  async getStatus() {
    if (!this.monitorEngine) {
      return { status: 'not_running' };
    }
    
    return await this.monitorEngine.getStatus();
  }

  async generateReport(options) {
    this.output.info(`Generating ${options.type} report for period: ${options.period}`);
    
    if (!this.monitorEngine) {
      // Initialize monitor engine for report generation
      await this.config.load();
      this.monitorEngine = new MonitorEngine(this.config.get());
    }
    
    const report = await this.monitorEngine.generateReport({
      type: options.type,
      period: options.period,
      outputPath: options.output
    });
    
    if (options.output) {
      this.output.success(`Report saved to: ${options.output}`);
    } else {
      this.output.displayReport(report);
    }
  }

  async manageConfig(options) {
    if (options.list) {
      const config = this.config.getAll();
      this.output.displayConfig(config);
    } else if (options.get) {
      const value = this.config.get(options.get);
      this.output.info(`${options.get}: ${JSON.stringify(value)}`);
    } else if (options.set) {
      const [key, value] = options.set.split('=');
      await this.config.set(key, value);
      this.output.success(`Configuration updated: ${key} = ${value}`);
    }
  }

  async shutdown() {
    if (this.monitorEngine) {
      await this.monitorEngine.stop();
    }
    
    if (this.webServer) {
      await this.webServer.stop();
    }
    
    this.output.info('Shutdown complete');
  }

  async waitForever() {
    return new Promise(() => {
      // Keep process alive
    });
  }
}

module.exports = CLICommander;
```

### 2.3 Monitor Engine (`src/monitor/engine.js`)

```javascript
const EventEmitter = require('events');
const LogParser = require('../parser/logParser');
const MemoryStore = require('../data/memoryStore');
const FileStore = require('../data/fileStore');
const Analyzer = require('../analysis/analyzer');
const Predictor = require('../analysis/predictor');
const AlertManager = require('../analysis/alertManager');
const Logger = require('../utils/logger');

class MonitorEngine extends EventEmitter {
  constructor(config) {
    super();
    
    this.config = config;
    this.logger = new Logger();
    this.isRunning = false;
    this.startTime = null;
    
    // Initialize components
    this.logParser = new LogParser(config.logPath || '~/.claude/logs/');
    this.memoryStore = new MemoryStore();
    this.fileStore = new FileStore(config.dataPath || '~/.claude-monitor/data/');
    this.analyzer = new Analyzer(this.memoryStore);
    this.predictor = new Predictor(this.memoryStore);
    this.alertManager = new AlertManager(config.alerts || {});
    
    // Bind event handlers
    this.setupEventHandlers();
  }

  async start() {
    if (this.isRunning) {
      throw new Error('Monitor engine is already running');
    }

    this.logger.info('Starting monitor engine...');
    this.startTime = new Date();
    
    try {
      // Initialize data stores
      await this.fileStore.initialize();
      await this.loadExistingData();
      
      // Start log parser
      await this.logParser.start();
      
      // Start analyzer
      await this.analyzer.start();
      
      // Start predictor
      await this.predictor.start();
      
      // Start alert manager
      await this.alertManager.start();
      
      this.isRunning = true;
      this.emit('started');
      
      this.logger.info('Monitor engine started successfully');
    } catch (error) {
      this.logger.error('Failed to start monitor engine:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping monitor engine...');
    
    try {
      // Stop components in reverse order
      await this.alertManager.stop();
      await this.predictor.stop();
      await this.analyzer.stop();
      await this.logParser.stop();
      
      // Save current state
      await this.saveCurrentState();
      
      this.isRunning = false;
      this.emit('stopped');
      
      this.logger.info('Monitor engine stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping monitor engine:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() - this.startTime.getTime() : 0,
      sessionsMonitored: this.memoryStore.getSessionCount(),
      activeAgents: this.memoryStore.getActiveAgentCount(),
      lastUpdate: this.memoryStore.getLastUpdate(),
      memoryUsage: process.memoryUsage(),
      version: '1.0.0'
    };
  }

  async generateReport(options) {
    const { type, period, outputPath } = options;
    
    this.logger.info(`Generating ${type} report for period: ${period}`);
    
    try {
      const reportData = await this.analyzer.generateReport({
        type,
        period,
        startDate: this.calculateStartDate(period),
        endDate: new Date()
      });
      
      if (outputPath) {
        await this.fileStore.saveReport(reportData, outputPath);
      }
      
      return reportData;
    } catch (error) {
      this.logger.error('Failed to generate report:', error);
      throw error;
    }
  }

  setupEventHandlers() {
    // Log parser events
    this.logParser.on('sessionStarted', this.handleSessionStarted.bind(this));
    this.logParser.on('sessionEnded', this.handleSessionEnded.bind(this));
    this.logParser.on('sessionUpdated', this.handleSessionUpdated.bind(this));
    this.logParser.on('error', this.handleParserError.bind(this));
    
    // Analyzer events
    this.analyzer.on('metricsUpdated', this.handleMetricsUpdated.bind(this));
    this.analyzer.on('anomalyDetected', this.handleAnomalyDetected.bind(this));
    
    // Predictor events
    this.predictor.on('predictionUpdated', this.handlePredictionUpdated.bind(this));
    this.predictor.on('alertTriggered', this.handleAlertTriggered.bind(this));
    
    // Alert manager events
    this.alertManager.on('alertSent', this.handleAlertSent.bind(this));
  }

  async handleSessionStarted(session) {
    this.logger.info(`Session started: ${session.id} (Agent: ${session.agentType})`);
    
    // Store session
    this.memoryStore.addSession(session);
    await this.fileStore.saveSession(session);
    
    // Update agent stats
    const agent = this.memoryStore.getAgent(session.agentId) || { id: session.agentId, type: session.agentType };
    agent.lastActive = session.startTime;
    agent.sessionCount = (agent.sessionCount || 0) + 1;
    this.memoryStore.updateAgent(agent);
    
    // Emit event for real-time updates
    this.emit('sessionStarted', session);
  }

  async handleSessionEnded(session) {
    this.logger.info(`Session ended: ${session.id} (Duration: ${session.duration}ms)`);
    
    // Update session
    this.memoryStore.updateSession(session.id, session);
    await this.fileStore.saveSession(session);
    
    // Update agent stats
    const agent = this.memoryStore.getAgent(session.agentId);
    if (agent) {
      agent.totalDuration = (agent.totalDuration || 0) + session.duration;
      agent.totalTokens = (agent.totalTokens || 0) + session.tokenUsage.total;
      this.memoryStore.updateAgent(agent);
    }
    
    // Trigger analysis
    await this.analyzer.analyzeSession(session);
    
    // Emit event for real-time updates
    this.emit('sessionEnded', session);
  }

  async handleSessionUpdated(session) {
    // Update session data
    this.memoryStore.updateSession(session.id, session);
    
    // Real-time prediction
    const prediction = await this.predictor.predictSessionEnd(session.id);
    
    // Emit event for real-time updates
    this.emit('sessionUpdated', { session, prediction });
  }

  handleParserError(error) {
    this.logger.error('Log parser error:', error);
    this.emit('error', error);
  }

  handleMetricsUpdated(metrics) {
    this.logger.debug('Metrics updated:', metrics);
    this.emit('metricsUpdated', metrics);
  }

  handleAnomalyDetected(anomaly) {
    this.logger.warn('Anomaly detected:', anomaly);
    this.emit('anomalyDetected', anomaly);
  }

  handlePredictionUpdated(prediction) {
    this.logger.debug('Prediction updated:', prediction);
    this.emit('predictionUpdated', prediction);
  }

  handleAlertTriggered(alert) {
    this.logger.warn('Alert triggered:', alert);
    this.emit('alertTriggered', alert);
  }

  handleAlertSent(alert) {
    this.logger.info('Alert sent:', alert);
    this.emit('alertSent', alert);
  }

  async loadExistingData() {
    try {
      // Load existing sessions
      const sessions = await this.fileStore.loadAllSessions();
      sessions.forEach(session => {
        this.memoryStore.addSession(session);
      });
      
      // Load existing agents
      const agents = await this.fileStore.loadAllAgents();
      agents.forEach(agent => {
        this.memoryStore.addAgent(agent);
      });
      
      this.logger.info(`Loaded ${sessions.length} sessions and ${agents.length} agents`);
    } catch (error) {
      this.logger.error('Failed to load existing data:', error);
    }
  }

  async saveCurrentState() {
    try {
      // Save all sessions
      const sessions = this.memoryStore.getAllSessions();
      for (const session of sessions) {
        await this.fileStore.saveSession(session);
      }
      
      // Save all agents
      const agents = this.memoryStore.getAllAgents();
      for (const agent of agents) {
        await this.fileStore.saveAgent(agent);
      }
      
      this.logger.info('Current state saved successfully');
    } catch (error) {
      this.logger.error('Failed to save current state:', error);
    }
  }

  calculateStartDate(period) {
    const now = new Date();
    
    switch (period) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = MonitorEngine;
```

### 2.4 Log Parser (`src/parser/logParser.js`)

```javascript
const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const EventEmitter = require('events');
const readline = require('readline');
const AgentDetector = require('./agentDetector');
const SessionAnalyzer = require('./sessionAnalyzer');
const Logger = require('../utils/logger');
const { expandTilde } = require('../utils/helpers');

class LogParser extends EventEmitter {
  constructor(logPath) {
    super();
    
    this.logPath = expandTilde(logPath);
    this.logger = new Logger();
    this.watcher = null;
    this.activeFiles = new Map();
    this.activeSessions = new Map();
    
    // Initialize components
    this.agentDetector = new AgentDetector();
    this.sessionAnalyzer = new SessionAnalyzer();
  }

  async start() {
    this.logger.info(`Starting log parser for path: ${this.logPath}`);
    
    try {
      // Ensure log directory exists
      await this.ensureLogDirectory();
      
      // Start watching for changes
      await this.startWatching();
      
      // Parse existing log files
      await this.parseExistingLogs();
      
      this.logger.info('Log parser started successfully');
    } catch (error) {
      this.logger.error('Failed to start log parser:', error);
      throw error;
    }
  }

  async stop() {
    this.logger.info('Stopping log parser...');
    
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    
    // Close all active file streams
    for (const [filePath, fileInfo] of this.activeFiles) {
      if (fileInfo.stream) {
        fileInfo.stream.close();
      }
    }
    
    this.activeFiles.clear();
    this.activeSessions.clear();
    
    this.logger.info('Log parser stopped');
  }

  async ensureLogDirectory() {
    try {
      await fs.access(this.logPath);
    } catch (error) {
      throw new Error(`Claude logs directory not found: ${this.logPath}. Please ensure Claude Code CLI is installed and has been used.`);
    }
  }

  async startWatching() {
    this.watcher = chokidar.watch(`${this.logPath}/**/*.jsonl`, {
      ignored: /[\/\\]\\./,
      persistent: true,
      ignoreInitial: false,
      followSymlinks: true,
      cwd: this.logPath
    });

    this.watcher
      .on('add', this.onFileAdded.bind(this))
      .on('change', this.onFileChanged.bind(this))
      .on('unlink', this.onFileRemoved.bind(this))
      .on('error', this.onWatcherError.bind(this));
  }

  async parseExistingLogs() {
    try {
      const files = await this.findLogFiles();
      
      for (const filePath of files) {
        await this.parseLogFile(filePath);
      }
      
      this.logger.info(`Parsed ${files.length} existing log files`);
    } catch (error) {
      this.logger.error('Failed to parse existing logs:', error);
    }
  }

  async findLogFiles() {
    const files = [];
    
    async function scanDirectory(dirPath) {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore directories we can't read
      }
    }
    
    await scanDirectory(this.logPath);
    return files;
  }

  async onFileAdded(filePath) {
    const fullPath = path.resolve(this.logPath, filePath);
    this.logger.debug(`New log file detected: ${fullPath}`);
    
    await this.parseLogFile(fullPath);
  }

  async onFileChanged(filePath) {
    const fullPath = path.resolve(this.logPath, filePath);
    this.logger.debug(`Log file changed: ${fullPath}`);
    
    await this.parseLogFileIncremental(fullPath);
  }

  async onFileRemoved(filePath) {
    const fullPath = path.resolve(this.logPath, filePath);
    this.logger.debug(`Log file removed: ${fullPath}`);
    
    // Clean up tracking
    this.activeFiles.delete(fullPath);
  }

  onWatcherError(error) {
    this.logger.error('File watcher error:', error);
    this.emit('error', error);
  }

  async parseLogFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const fileInfo = this.activeFiles.get(filePath) || {
        lastSize: 0,
        lastPosition: 0,
        sessions: new Set()
      };
      
      if (stats.size <= fileInfo.lastSize) {
        // File hasn't grown, skip
        return;
      }
      
      const stream = await this.createReadStream(filePath, fileInfo.lastPosition);
      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
      });
      
      for await (const line of rl) {
        if (line.trim()) {
          await this.processLogLine(line, filePath);
        }
      }
      
      // Update file tracking
      fileInfo.lastSize = stats.size;
      fileInfo.lastPosition = stats.size;
      this.activeFiles.set(filePath, fileInfo);
      
    } catch (error) {
      this.logger.error(`Failed to parse log file ${filePath}:`, error);
    }
  }

  async parseLogFileIncremental(filePath) {
    // Same as parseLogFile but only reads new content
    await this.parseLogFile(filePath);
  }

  async processLogLine(line, filePath) {
    try {
      const logEntry = JSON.parse(line);
      
      // Extract session information
      const sessionInfo = await this.extractSessionInfo(logEntry, filePath);
      
      if (sessionInfo) {
        await this.processSessionInfo(sessionInfo);
      }
      
    } catch (error) {
      this.logger.debug(`Failed to process log line: ${error.message}`);
    }
  }

  async extractSessionInfo(logEntry, filePath) {
    // Determine session ID
    const sessionId = this.extractSessionId(logEntry, filePath);
    
    if (!sessionId) {
      return null;
    }
    
    // Detect agent type
    const agentType = await this.agentDetector.detectAgent(logEntry);
    
    // Extract token usage
    const tokenUsage = this.extractTokenUsage(logEntry);
    
    // Determine event type
    const eventType = this.determineEventType(logEntry);
    
    return {
      sessionId,
      agentType,
      tokenUsage,
      eventType,
      timestamp: new Date(logEntry.timestamp || Date.now()),
      content: logEntry.content || '',
      metadata: {
        filePath,
        claudeVersion: logEntry.version,
        model: logEntry.model,
        rawEntry: logEntry
      }
    };
  }

  extractSessionId(logEntry, filePath) {
    // Try to extract session ID from log entry
    if (logEntry.session_id) {
      return logEntry.session_id;
    }
    
    // Generate session ID from file path and timestamp
    const fileName = path.basename(filePath);
    const timestamp = logEntry.timestamp || Date.now();
    
    return `${fileName}_${Math.floor(timestamp / 1000)}`;
  }

  extractTokenUsage(logEntry) {
    if (logEntry.usage) {
      return {
        input: logEntry.usage.input_tokens || 0,
        output: logEntry.usage.output_tokens || 0,
        total: (logEntry.usage.input_tokens || 0) + (logEntry.usage.output_tokens || 0)
      };
    }
    
    return { input: 0, output: 0, total: 0 };
  }

  determineEventType(logEntry) {
    if (logEntry.type) {
      return logEntry.type;
    }
    
    // Infer event type from content
    if (logEntry.role === 'user') {
      return 'user_input';
    } else if (logEntry.role === 'assistant') {
      return 'assistant_response';
    } else if (logEntry.content && logEntry.content.includes('tool_use')) {
      return 'tool_usage';
    }
    
    return 'unknown';
  }

  async processSessionInfo(sessionInfo) {
    const { sessionId, eventType } = sessionInfo;
    
    // Get or create session
    let session = this.activeSessions.get(sessionId);
    
    if (!session) {
      session = await this.createNewSession(sessionInfo);
      this.activeSessions.set(sessionId, session);
      this.emit('sessionStarted', session);
    }
    
    // Update session with new information
    session = await this.updateSession(session, sessionInfo);
    
    // Check if session ended
    if (this.isSessionEnd(sessionInfo)) {
      session.endTime = sessionInfo.timestamp;
      session.duration = session.endTime.getTime() - session.startTime.getTime();
      session.status = 'completed';
      
      this.activeSessions.delete(sessionId);
      this.emit('sessionEnded', session);
    } else {
      this.emit('sessionUpdated', session);
    }
  }

  async createNewSession(sessionInfo) {
    const session = {
      id: sessionInfo.sessionId,
      startTime: sessionInfo.timestamp,
      endTime: null,
      duration: 0,
      agentType: sessionInfo.agentType,
      agentId: `${sessionInfo.agentType}_${Date.now()}`,
      status: 'active',
      tokenUsage: { input: 0, output: 0, total: 0 },
      events: [],
      files: [],
      metadata: sessionInfo.metadata
    };
    
    return session;
  }

  async updateSession(session, sessionInfo) {
    // Add event
    session.events.push({
      timestamp: sessionInfo.timestamp,
      type: sessionInfo.eventType,
      tokenUsage: sessionInfo.tokenUsage,
      content: sessionInfo.content
    });
    
    // Update token usage
    session.tokenUsage.input += sessionInfo.tokenUsage.input;
    session.tokenUsage.output += sessionInfo.tokenUsage.output;
    session.tokenUsage.total += sessionInfo.tokenUsage.total;
    
    // Update agent type if more specific
    if (sessionInfo.agentType !== 'unknown' && session.agentType === 'unknown') {
      session.agentType = sessionInfo.agentType;
    }
    
    // Update last activity
    session.lastActivity = sessionInfo.timestamp;
    
    return session;
  }

  isSessionEnd(sessionInfo) {
    // Heuristics to determine if session has ended
    const endIndicators = [
      'session_end',
      'conversation_end',
      'user_disconnect',
      'timeout'
    ];
    
    return endIndicators.includes(sessionInfo.eventType) ||
           (Date.now() - sessionInfo.timestamp.getTime() > 5 * 60 * 1000); // 5 minutes timeout
  }

  async createReadStream(filePath, start = 0) {
    const fs = require('fs');
    
    return fs.createReadStream(filePath, {
      encoding: 'utf8',
      start: start
    });
  }
}

module.exports = LogParser;
```

### 2.5 Agent Detector (`src/parser/agentDetector.js`)

```javascript
const Logger = require('../utils/logger');

class AgentDetector {
  constructor() {
    this.logger = new Logger();
    
    // Agent detection patterns
    this.patterns = {
      ceo: {
        keywords: ['戦略', '意思決定', '全体最適', 'データが物語っている', 'CEO', '経営', 'ROI', 'KPI'],
        phrases: [
          /全体最適で考えよう/gi,
          /データが物語っている/gi,
          /戦略的に/gi,
          /投資対効果/gi,
          /長期的視点/gi
        ],
        weight: 3
      },
      
      cto: {
        keywords: ['技術', 'アーキテクチャ', 'セキュリティ', 'パフォーマンス', 'CTO', 'システム設計', 'インフラ'],
        phrases: [
          /技術的な観点から/gi,
          /アーキテクチャ設計/gi,
          /パフォーマンス最適化/gi,
          /セキュリティリスク/gi,
          /スケーラビリティ/gi
        ],
        weight: 3
      },
      
      pm: {
        keywords: ['プロジェクト', 'タスク', '進捗', 'スケジュール', 'PM', 'マイルストーン', 'リスク管理'],
        phrases: [
          /プロジェクト管理/gi,
          /タスク分解/gi,
          /進捗状況/gi,
          /スケジュール調整/gi,
          /リソース配分/gi
        ],
        weight: 3
      },
      
      frontend: {
        keywords: ['UI', 'UX', 'React', 'Vue', 'CSS', 'HTML', 'JavaScript', 'コンポーネント', 'デザイン'],
        phrases: [
          /ユーザーインターフェース/gi,
          /フロントエンド/gi,
          /レスポンシブデザイン/gi,
          /ユーザビリティ/gi,
          /ユーザーエクスペリエンス/gi
        ],
        weight: 3
      },
      
      backend: {
        keywords: ['API', 'データベース', 'サーバー', 'Node.js', 'Express', 'MongoDB', 'SQL', 'REST'],
        phrases: [
          /バックエンド/gi,
          /サーバーサイド/gi,
          /データベース設計/gi,
          /API開発/gi,
          /マイクロサービス/gi
        ],
        weight: 3
      },
      
      qa: {
        keywords: ['テスト', '品質', 'バグ', '検証', 'QA', 'デバッグ', 'テストケース', '自動化'],
        phrases: [
          /品質保証/gi,
          /テスト計画/gi,
          /バグ修正/gi,
          /品質管理/gi,
          /テスト自動化/gi
        ],
        weight: 3
      },
      
      security: {
        keywords: ['セキュリティ', '脆弱性', '認証', '暗号化', 'HTTPS', 'SQL injection', 'XSS'],
        phrases: [
          /セキュリティ監査/gi,
          /脆弱性診断/gi,
          /セキュリティ対策/gi,
          /認証認可/gi,
          /データ保護/gi
        ],
        weight: 3
      },
      
      researcher: {
        keywords: ['調査', '分析', 'リサーチ', 'データ収集', '統計', '市場調査', 'ベンチマーク'],
        phrases: [
          /市場調査/gi,
          /データ分析/gi,
          /競合分析/gi,
          /トレンド調査/gi,
          /統計解析/gi
        ],
        weight: 3
      }
    };
    
    // File-based detection patterns
    this.filePatterns = {
      frontend: [/\.html$/i, /\.css$/i, /\.js$/i, /\.jsx$/i, /\.vue$/i, /\.tsx$/i],
      backend: [/\.js$/i, /\.ts$/i, /\.py$/i, /\.java$/i, /server/i, /api/i],
      qa: [/test/i, /spec/i, /\.test\./i, /\.spec\./i],
      security: [/security/i, /auth/i, /crypto/i, /ssl/i]
    };
  }

  async detectAgent(logEntry) {
    try {
      // Extract content for analysis
      const content = this.extractContent(logEntry);
      
      if (!content) {
        return 'unknown';
      }
      
      // Calculate scores for each agent type
      const scores = {};
      
      for (const [agentType, patterns] of Object.entries(this.patterns)) {
        scores[agentType] = this.calculateScore(content, patterns);
      }
      
      // Add file-based detection
      const fileScore = this.calculateFileBasedScore(logEntry);
      for (const [agentType, score] of Object.entries(fileScore)) {
        scores[agentType] = (scores[agentType] || 0) + score;
      }
      
      // Find agent with highest score
      const bestMatch = Object.entries(scores)
        .sort(([, a], [, b]) => b - a)[0];
      
      if (bestMatch && bestMatch[1] > 0) {
        this.logger.debug(`Detected agent: ${bestMatch[0]} (score: ${bestMatch[1]})`);
        return bestMatch[0];
      }
      
      return 'unknown';
      
    } catch (error) {
      this.logger.error('Agent detection error:', error);
      return 'unknown';
    }
  }

  extractContent(logEntry) {
    let content = '';
    
    // Extract from various possible fields
    if (logEntry.content) {
      content += logEntry.content + ' ';
    }
    
    if (logEntry.message) {
      content += logEntry.message + ' ';
    }
    
    if (logEntry.text) {
      content += logEntry.text + ' ';
    }
    
    // Extract from tool usage
    if (logEntry.tool_calls) {
      for (const toolCall of logEntry.tool_calls) {
        if (toolCall.function && toolCall.function.arguments) {
          content += JSON.stringify(toolCall.function.arguments) + ' ';
        }
      }
    }
    
    // Extract from file operations
    if (logEntry.files) {
      for (const file of logEntry.files) {
        content += file.path + ' ' + (file.content || '') + ' ';
      }
    }
    
    return content.toLowerCase().trim();
  }

  calculateScore(content, patterns) {
    let score = 0;
    
    // Keyword matching
    for (const keyword of patterns.keywords) {
      const regex = new RegExp(keyword.toLowerCase(), 'gi');
      const matches = content.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    
    // Phrase matching (higher weight)
    for (const phrase of patterns.phrases) {
      const matches = content.match(phrase);
      if (matches) {
        score += matches.length * patterns.weight;
      }
    }
    
    return score;
  }

  calculateFileBasedScore(logEntry) {
    const scores = {};
    
    // Extract file paths from log entry
    const filePaths = this.extractFilePaths(logEntry);
    
    for (const filePath of filePaths) {
      for (const [agentType, patterns] of Object.entries(this.filePatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(filePath)) {
            scores[agentType] = (scores[agentType] || 0) + 2;
          }
        }
      }
    }
    
    return scores;
  }

  extractFilePaths(logEntry) {
    const paths = [];
    
    // Extract from tool calls
    if (logEntry.tool_calls) {
      for (const toolCall of logEntry.tool_calls) {
        if (toolCall.function && toolCall.function.name === 'Write') {
          const args = JSON.parse(toolCall.function.arguments || '{}');
          if (args.file_path) {
            paths.push(args.file_path);
          }
        }
        
        if (toolCall.function && toolCall.function.name === 'Read') {
          const args = JSON.parse(toolCall.function.arguments || '{}');
          if (args.file_path) {
            paths.push(args.file_path);
          }
        }
      }
    }
    
    // Extract from files array
    if (logEntry.files) {
      for (const file of logEntry.files) {
        if (file.path) {
          paths.push(file.path);
        }
      }
    }
    
    return paths;
  }

  // Add learning capability
  learnFromSession(sessionData) {
    // Analyze successful agent detections and improve patterns
    // This could be enhanced with machine learning in the future
    
    const { agentType, content, files } = sessionData;
    
    if (agentType === 'unknown') {
      return; // Can't learn from unknown agents
    }
    
    // Extract new keywords that frequently appear with confirmed agents
    const words = content.toLowerCase().match(/\b\w{3,}\b/g) || [];
    const wordFreq = {};
    
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
    
    // Find high-frequency words that aren't already in patterns
    const existingKeywords = this.patterns[agentType]?.keywords || [];
    const newKeywords = Object.entries(wordFreq)
      .filter(([word, freq]) => freq > 2 && !existingKeywords.includes(word))
      .map(([word]) => word);
    
    if (newKeywords.length > 0) {
      this.logger.debug(`Learned new keywords for ${agentType}:`, newKeywords);
      // In a production system, we might save these to a learning database
    }
  }
}

module.exports = AgentDetector;
```

## 3. Package.json Configuration

```json
{
  "name": "claude-agent-monitor",
  "version": "1.0.0",
  "description": "Claude Code Agent Activity Monitoring CLI",
  "main": "src/index.js",
  "bin": {
    "claude-monitor": "./bin/claude-monitor.js"
  },
  "scripts": {
    "start": "node bin/claude-monitor.js",
    "dev": "nodemon bin/claude-monitor.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/ tests/",
    "lint:fix": "eslint src/ tests/ --fix",
    "build": "npm run test && npm run lint",
    "prepare": "npm run build"
  },
  "keywords": [
    "claude",
    "ai",
    "monitoring",
    "cli",
    "agent",
    "analytics"
  ],
  "author": "AI Virtual Corporation",
  "license": "MIT",
  "dependencies": {
    "commander": "^9.4.1",
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "chokidar": "^3.5.3",
    "chalk": "^4.1.2",
    "ora": "^5.4.1",
    "inquirer": "^8.2.5",
    "table": "^6.8.1",
    "chart.js": "^3.9.1",
    "date-fns": "^2.29.3",
    "lodash": "^4.17.21",
    "crypto-js": "^4.1.1",
    "joi": "^17.9.2"
  },
  "devDependencies": {
    "jest": "^29.6.2",
    "nodemon": "^3.0.1",
    "eslint": "^8.45.0",
    "eslint-config-standard": "^17.1.0",
    "supertest": "^6.3.3",
    "@types/jest": "^29.5.3"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "files": [
    "bin/",
    "src/",
    "config/",
    "README.md",
    "LICENSE"
  ]
}
```

## 4. 設定ファイル (`config/default.json`)

```json
{
  "logPath": "~/.claude/logs/",
  "dataPath": "~/.claude-monitor/data/",
  "dashboard": {
    "port": 3333,
    "host": "localhost",
    "autoStart": true
  },
  "monitoring": {
    "pollInterval": 1000,
    "sessionTimeout": 300000,
    "maxSessions": 100
  },
  "agents": {
    "enabled": [
      "ceo",
      "cto", 
      "pm",
      "frontend",
      "backend",
      "qa",
      "security",
      "researcher"
    ],
    "detection": {
      "confidence": 0.7,
      "learning": true
    }
  },
  "alerts": {
    "enabled": true,
    "thresholds": {
      "tokenUsage": 0.8,
      "sessionTime": 3600000,
      "errorRate": 0.1
    },
    "channels": ["console", "dashboard"]
  },
  "storage": {
    "retentionDays": 30,
    "compression": true,
    "encryption": false
  },
  "security": {
    "authentication": false,
    "cors": {
      "origin": ["http://localhost:3333"],
      "credentials": true
    }
  },
  "logging": {
    "level": "info",
    "file": "~/.claude-monitor/logs/monitor.log",
    "maxFiles": 5,
    "maxSize": "10m"
  }
}
```

## 5. プロジェクトファイル構造の最終確認

プロジェクトの完全な実装構造は上記の通りです。次に実装段階に移ります。

---

**作成完了**: 詳細設計書  
**次段階**: 実装開始  
**総ページ数**: 詳細設計書 - 50ページ相当  
**技術スタック**: Node.js, Express, Socket.IO, Chart.js  
**実装予定期間**: 2週間（MVP）