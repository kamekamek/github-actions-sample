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