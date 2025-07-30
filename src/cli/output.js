const chalk = require('chalk');
const { table } = require('table');
const ora = require('ora');
const { formatBytes, formatDuration, formatNumber, calculatePercentage } = require('../utils/helpers');

class CLIOutput {
  constructor(options = {}) {
    this.enableColor = options.enableColor !== false && process.stdout.isTTY;
    this.verbose = options.verbose || false;
    this.spinner = null;
  }

  // Basic output methods
  success(message) {
    const icon = this.enableColor ? chalk.green('✓') : '[SUCCESS]';
    console.log(`${icon} ${message}`);
  }

  error(message) {
    const icon = this.enableColor ? chalk.red('✗') : '[ERROR]';
    console.error(`${icon} ${message}`);
  }

  warning(message) {
    const icon = this.enableColor ? chalk.yellow('⚠') : '[WARNING]';
    console.log(`${icon} ${message}`);
  }

  info(message) {
    const icon = this.enableColor ? chalk.blue('ℹ') : '[INFO]';
    console.log(`${icon} ${message}`);
  }

  debug(message) {
    if (!this.verbose) return;
    const icon = this.enableColor ? chalk.gray('●') : '[DEBUG]';
    console.log(`${icon} ${message}`);
  }

  // Spinner methods
  startSpinner(text) {
    if (this.spinner) {
      this.spinner.stop();
    }
    
    this.spinner = ora({
      text,
      color: 'blue',
      spinner: 'dots'
    });
    
    this.spinner.start();
  }

  updateSpinner(text) {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  stopSpinner(success = true, message = '') {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(message);
      } else {
        this.spinner.fail(message);
      }
      this.spinner = null;
    }
  }

  // Display methods for complex data
  displayStatus(status) {
    console.log('\n' + chalk.bold('Claude Agent Monitor Status'));
    console.log('━'.repeat(50));
    
    const statusColor = status.isRunning 
      ? chalk.green('RUNNING') 
      : chalk.red('STOPPED');
    
    const statusData = [
      ['Status', statusColor],
      ['Uptime', formatDuration(status.uptime || 0)],
      ['Sessions Monitored', formatNumber(status.sessionsMonitored || 0)],
      ['Active Agents', formatNumber(status.activeAgents || 0)],
      ['Last Update', status.lastUpdate ? new Date(status.lastUpdate).toLocaleString() : 'Never'],
      ['Version', status.version || '1.0.0']
    ];

    if (status.memoryUsage) {
      statusData.push(['Memory Usage', formatBytes(status.memoryUsage.rss)]);
    }

    const tableConfig = {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinLeft: '├',
        joinRight: '┤',
        joinJoin: '┼'
      },
      columnDefault: {
        paddingLeft: 1,
        paddingRight: 1
      }
    };

    console.log(table(statusData, tableConfig));
  }

  displayReport(report) {
    console.log('\n' + chalk.bold(`${report.type} Report - ${report.period}`));
    console.log('━'.repeat(50));

    if (report.summary) {
      this.displayReportSummary(report.summary);
    }

    if (report.agents) {
      this.displayAgentReport(report.agents);
    }

    if (report.sessions) {
      this.displaySessionReport(report.sessions);
    }

    if (report.metrics) {
      this.displayMetricsReport(report.metrics);
    }
  }

  displayReportSummary(summary) {
    console.log(chalk.bold('\nSummary:'));
    
    const summaryData = [
      ['Total Sessions', formatNumber(summary.totalSessions || 0)],
      ['Total Duration', formatDuration(summary.totalDuration || 0)],
      ['Total Tokens', formatNumber(summary.totalTokens || 0)],
      ['Average Session Time', formatDuration(summary.averageSessionTime || 0)],
      ['Most Active Agent', summary.mostActiveAgent || 'N/A'],
      ['Efficiency Score', `${summary.efficiencyScore || 0}%`]
    ];

    console.log(table(summaryData));
  }

  displayAgentReport(agents) {
    console.log(chalk.bold('\nAgent Activity:'));
    
    const headers = ['Agent', 'Sessions', 'Duration', 'Tokens', 'Efficiency'];
    const rows = [headers];

    agents.forEach(agent => {
      rows.push([
        agent.type || 'Unknown',
        formatNumber(agent.sessionCount || 0),
        formatDuration(agent.totalDuration || 0),
        formatNumber(agent.totalTokens || 0),
        `${agent.efficiency || 0}%`
      ]);
    });

    console.log(table(rows));
  }

  displaySessionReport(sessions) {
    console.log(chalk.bold('\nRecent Sessions:'));
    
    const headers = ['Start Time', 'Agent', 'Duration', 'Tokens', 'Status'];
    const rows = [headers];

    sessions.slice(0, 10).forEach(session => {
      const statusColor = session.status === 'completed' 
        ? chalk.green(session.status)
        : chalk.yellow(session.status);

      rows.push([
        new Date(session.startTime).toLocaleString(),
        session.agentType || 'Unknown',
        formatDuration(session.duration || 0),
        formatNumber(session.tokenUsage?.total || 0),
        statusColor
      ]);
    });

    console.log(table(rows));
  }

  displayMetricsReport(metrics) {
    console.log(chalk.bold('\nMetrics:'));
    
    const metricsData = [
      ['Average Response Time', `${metrics.averageResponseTime || 0}ms`],
      ['Token Rate', `${metrics.tokenRate || 0} tokens/min`],
      ['Error Rate', `${metrics.errorRate || 0}%`],
      ['Peak Usage Hour', metrics.peakUsageHour || 'N/A'],
      ['Total Cost (Est.)', `$${metrics.estimatedCost || 0}`]
    ];

    console.log(table(metricsData));
  }

  displayConfig(config) {
    console.log('\n' + chalk.bold('Configuration'));
    console.log('━'.repeat(50));

    this.displayConfigSection('General', {
      'Log Path': config.logPath,
      'Data Path': config.dataPath,
      'Dashboard Port': config.dashboard?.port,
      'Monitoring Enabled': config.monitoring?.enabled ? 'Yes' : 'No'
    });

    this.displayConfigSection('Agents', {
      'Enabled Agents': config.agents?.enabled?.join(', ') || 'None',
      'Detection Confidence': `${(config.agents?.detection?.confidence || 0) * 100}%`,
      'Learning Enabled': config.agents?.detection?.learning ? 'Yes' : 'No'
    });

    this.displayConfigSection('Alerts', {
      'Alerts Enabled': config.alerts?.enabled ? 'Yes' : 'No',
      'Token Usage Threshold': `${(config.alerts?.thresholds?.tokenUsage || 0) * 100}%`,
      'Session Time Threshold': formatDuration(config.alerts?.thresholds?.sessionTime || 0),
      'Alert Channels': config.alerts?.channels?.join(', ') || 'None'
    });
  }

  displayConfigSection(title, data) {
    console.log(`\n${chalk.bold(title)}:`);
    
    const rows = Object.entries(data).map(([key, value]) => [
      chalk.cyan(key),
      String(value)
    ]);

    console.log(table(rows));
  }

  displayProgress(current, total, label = '') {
    const percentage = calculatePercentage(current, total);
    const barLength = 30;
    const filledLength = Math.round(barLength * (percentage / 100));
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    const percentageStr = this.enableColor 
      ? chalk.bold(`${percentage}%`)
      : `${percentage}%`;
    
    const progressBar = this.enableColor
      ? chalk.green(bar)
      : bar;
    
    console.log(`${label} ${progressBar} ${percentageStr} (${current}/${total})`);
  }

  displayLiveStats(stats) {
    // Clear screen and move cursor to top
    process.stdout.write('\x1b[2J\x1b[H');
    
    console.log(chalk.bold('Claude Agent Monitor - Live Stats'));
    console.log('━'.repeat(50));
    console.log(`Last Update: ${new Date().toLocaleString()}`);
    console.log();

    // Active sessions
    if (stats.activeSessions && stats.activeSessions.length > 0) {
      console.log(chalk.bold('Active Sessions:'));
      stats.activeSessions.forEach(session => {
        const duration = Date.now() - new Date(session.startTime).getTime();
        const agentColor = this.getAgentColor(session.agentType);
        
        console.log(`  ${agentColor(session.agentType)} - ${formatDuration(duration)} - ${formatNumber(session.tokenUsage?.total || 0)} tokens`);
      });
      console.log();
    }

    // Real-time metrics
    if (stats.metrics) {
      console.log(chalk.bold('Real-time Metrics:'));
      console.log(`  Token Rate: ${stats.metrics.tokenRate || 0} tokens/min`);
      console.log(`  Active Agents: ${stats.metrics.activeAgents || 0}`);
      console.log(`  Memory Usage: ${formatBytes(stats.metrics.memoryUsage || 0)}`);
      console.log();
    }

    // Predictions
    if (stats.predictions) {
      console.log(chalk.bold('Predictions:'));
      stats.predictions.forEach(prediction => {
        const confidenceColor = prediction.confidence > 0.8 
          ? chalk.green 
          : prediction.confidence > 0.6 
            ? chalk.yellow 
            : chalk.red;
        
        console.log(`  ${prediction.message} (${confidenceColor(`${Math.round(prediction.confidence * 100)}%`)})`);
      });
      console.log();
    }

    console.log(chalk.gray('Press Ctrl+C to stop monitoring'));
  }

  getAgentColor(agentType) {
    const colors = {
      ceo: chalk.red.bold,
      cto: chalk.blue,
      pm: chalk.green,
      frontend: chalk.magenta,
      backend: chalk.cyan,
      qa: chalk.yellow,
      security: chalk.red,
      researcher: chalk.gray
    };
    
    return colors[agentType] || chalk.white;
  }

  // Utility methods
  clearScreen() {
    process.stdout.write('\x1b[2J\x1b[H');
  }

  moveCursor(x, y) {
    process.stdout.write(`\x1b[${y};${x}H`);
  }

  hideCursor() {
    process.stdout.write('\x1b[?25l');
  }

  showCursor() {
    process.stdout.write('\x1b[?25h');
  }

  // Input methods
  async confirm(message, defaultValue = false) {
    const inquirer = require('inquirer');
    
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: defaultValue
      }
    ]);
    
    return confirmed;
  }

  async select(message, choices) {
    const inquirer = require('inquirer');
    
    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message,
        choices
      }
    ]);
    
    return selected;
  }

  async input(message, defaultValue = '') {
    const inquirer = require('inquirer');
    
    const { value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message,
        default: defaultValue
      }
    ]);
    
    return value;
  }
}

module.exports = CLIOutput;