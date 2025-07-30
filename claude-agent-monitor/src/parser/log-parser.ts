/**
 * Claude Code JSONL Log Parser
 * Parses Claude Code JSONL logs to extract agent activities
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ClaudeSession, AgentActivity, LogEntry, AgentType } from '../types/index.js';

export interface JSONLLogEntry {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  gitBranch: string;
  type: 'user' | 'assistant' | 'system' | 'summary';
  message?: {
    id?: string;
    type?: 'message';
    role?: 'user' | 'assistant';
    model?: string;
    content?: Array<{
      type: 'text' | 'tool_use' | 'tool_result';
      id?: string;
      name?: string;
      text?: string;
      input?: {
        description?: string;
        prompt?: string;
        subagent_type?: string;
        [key: string]: any;
      };
      [key: string]: any;
    }>;
    usage?: {
      input_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      output_tokens: number;
      service_tier?: string;
    };
    [key: string]: any;
  };
  content?: string;
  uuid: string;
  timestamp: string;
  summary?: string;
  leafUuid?: string;
  toolUseID?: string;
  [key: string]: any;
}

export class ClaudeLogParser {
  private claudeProjectsDir: string;

  constructor(projectPath?: string) {
    if (projectPath) {
      this.claudeProjectsDir = projectPath;
    } else {
      // Default Claude projects directory
      const homeDir = os.homedir();
      this.claudeProjectsDir = path.join(homeDir, '.claude', 'projects');
    }
  }

  /**
   * Parse all Claude Code session logs
   */
  async parseSessionLogs(): Promise<ClaudeSession[]> {
    const sessions: ClaudeSession[] = [];
    
    try {
      if (!(await fs.pathExists(this.claudeProjectsDir))) {
        console.warn(`Claude projects directory ${this.claudeProjectsDir} not found`);
        return sessions;
      }

      // Find project directories (they contain the working directory path in their name)
      const projectDirs = await fs.readdir(this.claudeProjectsDir);
      
      for (const projectDir of projectDirs) {
        const projectPath = path.join(this.claudeProjectsDir, projectDir);
        const stat = await fs.stat(projectPath);
        
        if (!stat.isDirectory()) continue;

        const jsonlFiles = (await fs.readdir(projectPath))
          .filter(name => name.endsWith('.jsonl'));

        for (const jsonlFile of jsonlFiles) {
          const filePath = path.join(projectPath, jsonlFile);
          const session = await this.parseJSONLFile(filePath);
          if (session) {
            sessions.push(session);
          }
        }
      }
    } catch (error) {
      console.error('Session parsing error:', error);
    }

    return sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Parse a single JSONL file
   */
  private async parseJSONLFile(filePath: string): Promise<ClaudeSession | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        return null;
      }

      const entries: JSONLLogEntry[] = [];
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as JSONLLogEntry;
          entries.push(entry);
        } catch (parseError) {
          console.warn(`Failed to parse JSONL line in ${filePath}:`, parseError);
          continue;
        }
      }

      if (entries.length === 0) {
        return null;
      }

      // Find first entry with valid timestamp and sessionId
      const firstEntryWithTimestamp = entries.find(e => e.timestamp && e.sessionId);
      if (!firstEntryWithTimestamp) {
        return null;
      }
      
      const sessionId = firstEntryWithTimestamp.sessionId;
      const startTime = new Date(firstEntryWithTimestamp.timestamp);
      
      // Extract agent activities from Task tool calls
      const activities = this.extractAgentActivitiesFromJSONL(entries);

      // Find last entry with valid timestamp
      const lastEntryWithTimestamp = entries.slice().reverse().find(e => e.timestamp);
      const endTime = lastEntryWithTimestamp ? new Date(lastEntryWithTimestamp.timestamp) : startTime;

      const session: ClaudeSession = {
        sessionId,
        startTime,
        endTime,
        workingDirectory: firstEntryWithTimestamp.cwd,
        totalTasks: activities.length,
        completedTasks: activities.filter(a => a.success).length,
        agents: activities,
        metadata: {
          version: firstEntryWithTimestamp.version,
          gitBranch: firstEntryWithTimestamp.gitBranch,
          totalEntries: entries.length,
          sourceFile: filePath
        }
      };

      return session;
    } catch (error) {
      console.error(`File parsing error ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract agent activities from JSONL entries
   */
  private extractAgentActivitiesFromJSONL(entries: JSONLLogEntry[]): AgentActivity[] {
    const activities: AgentActivity[] = [];
    let activityCounter = 0;

    for (const entry of entries) {
      // Look for assistant messages with tool_use content
      if (entry.type === 'assistant' && entry.message?.content) {
        for (const contentItem of entry.message.content) {
          // Check for Task tool calls with subagent_type
          if (contentItem.type === 'tool_use' && 
              contentItem.name === 'Task' && 
              contentItem.input?.subagent_type) {
            
            const agentType = this.normalizeAgentType(contentItem.input.subagent_type);
            if (!agentType) continue;

            const taskDescription = contentItem.input.description || 
                                  contentItem.input.prompt?.substring(0, 100) || 
                                  'Agent task execution';

            const startTime = new Date(entry.timestamp);
            // Estimate end time (we don't have exact duration from logs)
            const endTime = new Date(startTime.getTime() + (5 * 60 * 1000)); // 5 minutes default
            const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

            const activity: AgentActivity = {
              agentId: `${agentType}_${activityCounter}`,
              agentType,
              taskId: contentItem.id || `task_${activityCounter}`,
              startTime,
              endTime,
              duration,
              status: 'completed', // We assume completed since it's in the log
              inputTokens: entry.message?.usage?.input_tokens || 0,
              outputTokens: entry.message?.usage?.output_tokens || 0,
              toolsUsed: ['Task'],
              files: [],
              success: true,
              metadata: {
                sessionId: entry.sessionId,
                parentUuid: entry.parentUuid,
                toolUseId: contentItem.id,
                isSidechain: entry.isSidechain,
                model: entry.message?.model,
                fullPrompt: contentItem.input?.prompt,
                taskDescription: taskDescription
              }
            };

            activities.push(activity);
            activityCounter++;
          }
        }
      }
    }

    return activities;
  }

  /**
   * Normalize agent type from subagent_type
   */
  private normalizeAgentType(subagentType: string): AgentType | null {
    // Direct mapping from Claude Code subagent types
    const typeMap: Record<string, AgentType> = {
      'ceo': 'ceo',
      'cto': 'cto',
      'project-manager': 'project-manager',
      'frontend-developer': 'frontend-developer',
      'backend-developer': 'backend-developer',
      'qa-engineer': 'qa-engineer',
      'deep-researcher': 'deep-researcher',
      'ai-security-specialist': 'ai-security-specialist',
      'general-purpose': 'general-purpose'
    };

    return typeMap[subagentType] || null;
  }

  /**
   * Parse log entries from JSONL content
   */
  async parseLogEntries(logContent: string): Promise<LogEntry[]> {
    const entries: LogEntry[] = [];
    const lines = logContent.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const jsonEntry = JSON.parse(line) as JSONLLogEntry;
        
        const entry: LogEntry = {
          timestamp: new Date(jsonEntry.timestamp),
          level: this.determineLogLevel(jsonEntry),
          source: this.determineSource(jsonEntry),
          message: this.formatMessage(jsonEntry),
          metadata: {
            sessionId: jsonEntry.sessionId,
            uuid: jsonEntry.uuid,
            type: jsonEntry.type,
            parentUuid: jsonEntry.parentUuid
          }
        };

        entries.push(entry);
      } catch (error) {
        // Skip invalid JSON lines
        continue;
      }
    }

    return entries;
  }

  /**
   * Determine log level from JSONL entry
   */
  private determineLogLevel(entry: JSONLLogEntry): 'info' | 'warn' | 'error' | 'debug' {
    if (entry.type === 'system') return 'debug';
    if (entry.content?.toLowerCase().includes('error')) return 'error';
    if (entry.content?.toLowerCase().includes('warn')) return 'warn';
    return 'info';
  }

  /**
   * Determine source from JSONL entry
   */
  private determineSource(entry: JSONLLogEntry): 'claude' | 'agent' | 'system' {
    if (entry.type === 'system') return 'system';
    if (entry.message?.content?.some(c => c.type === 'tool_use' && c.name === 'Task')) return 'agent';
    return 'claude';
  }

  /**
   * Format message from JSONL entry
   */
  private formatMessage(entry: JSONLLogEntry): string {
    if (entry.type === 'summary') {
      return `Session Summary: ${entry.summary}`;
    }
    
    if (entry.message?.content) {
      const textContent = entry.message.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join(' ');
      
      const toolUse = entry.message.content
        .filter(c => c.type === 'tool_use')
        .map(c => `[${c.name}] ${c.input?.description || 'Tool execution'}`)
        .join(', ');
      
      return [textContent, toolUse].filter(Boolean).join(' | ');
    }
    
    return entry.content || 'Unknown log entry';
  }

  /**
   * Start watching for new JSONL files
   */
  async startWatching(callback: (session: ClaudeSession) => void): Promise<void> {
    const chokidar = await import('chokidar');
    
    const watcher = chokidar.watch([
      path.join(this.claudeProjectsDir, '**/*.jsonl')
    ], {
      ignored: /(^|[\/\\])\../, // 隠しファイルを除外
      persistent: true
    });

    watcher.on('add', async (filePath: string) => {
      console.log(`New JSONL log file detected: ${filePath}`);
      
      const session = await this.parseJSONLFile(filePath);
      if (session) {
        callback(session);
      }
    });

    watcher.on('change', async (filePath: string) => {
      console.log(`JSONL log file updated: ${filePath}`);
      
      const session = await this.parseJSONLFile(filePath);
      if (session) {
        callback(session);
      }
    });

    console.log(`Started watching for JSONL logs: ${this.claudeProjectsDir}`);
  }

  /**
   * Get the correct Claude projects directory for current working directory
   */
  static getClaudeProjectsPath(workingDir: string): string {
    const homeDir = os.homedir();
    const baseProjectsDir = path.join(homeDir, '.claude', 'projects');
    
    // Convert working directory path to the format used by Claude Code
    // e.g., /Users/user/project -> -Users-user-project
    const encodedPath = workingDir.replace(/\//g, '-');
    
    return path.join(baseProjectsDir, encodedPath);
  }

  /**
   * Find the most recent session file for a project
   */
  static async findLatestSessionFile(projectPath: string): Promise<string | null> {
    try {
      if (!(await fs.pathExists(projectPath))) {
        return null;
      }

      const jsonlFiles = (await fs.readdir(projectPath))
        .filter(name => name.endsWith('.jsonl'));

      if (jsonlFiles.length === 0) {
        return null;
      }

      // Get file stats and sort by modification time
      const filesWithStats = await Promise.all(
        jsonlFiles.map(async name => ({
          name,
          path: path.join(projectPath, name),
          mtime: (await fs.stat(path.join(projectPath, name))).mtime
        }))
      );

      const sortedFiles = filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      return sortedFiles[0].path;
    } catch (error) {
      console.error('Error finding latest session file:', error);
      return null;
    }
  }
}