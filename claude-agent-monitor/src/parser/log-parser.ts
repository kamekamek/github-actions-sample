/**
 * Claude Code Log Parser
 * Claude Codeのセッションログを解析してエージェント活動を抽出
 */

import fs from 'fs-extra';
import path from 'path';
import { ClaudeSession, AgentActivity, LogEntry, AgentType } from '../types/index.js';

export class ClaudeLogParser {
  private logDirectory: string;
  
  constructor(logDirectory: string) {
    this.logDirectory = logDirectory;
  }

  /**
   * Claude Codeセッションログを解析
   */
  async parseSessionLogs(): Promise<ClaudeSession[]> {
    const sessions: ClaudeSession[] = [];
    
    try {
      // .claude ディレクトリからチャット履歴を読み込み
      const claudeDir = path.join(this.logDirectory, '.claude');
      if (await fs.pathExists(claudeDir)) {
        const chatSessions = await this.parseChatLogs(claudeDir);
        sessions.push(...chatSessions);
      }

      // コマンド履歴から Task実行ログを解析
      const taskLogs = await this.parseTaskLogs();
      sessions.push(...taskLogs);

      return sessions;
    } catch (error) {
      console.error('ログ解析エラー:', error);
      return [];
    }
  }

  /**
   * チャット履歴から会話セッションを解析
   */
  private async parseChatLogs(claudeDir: string): Promise<ClaudeSession[]> {
    const sessions: ClaudeSession[] = [];
    
    try {
      const chatDir = path.join(claudeDir, 'chat');
      if (!(await fs.pathExists(chatDir))) {
        return sessions;
      }

      // 年/月のディレクトリ構造を走査
      const years = await fs.readdir(chatDir);
      
      for (const year of years) {
        const yearPath = path.join(chatDir, year);
        if (!(await fs.stat(yearPath)).isDirectory()) continue;

        const months = await fs.readdir(yearPath);
        
        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          if (!(await fs.stat(monthPath)).isDirectory()) continue;

          const chatFiles = await fs.readdir(monthPath);
          
          for (const file of chatFiles) {
            if (file.endsWith('-team-chat.md')) {
              const session = await this.parseTeamChatFile(path.join(monthPath, file));
              if (session) sessions.push(session);
            }
          }
        }
      }
    } catch (error) {
      console.error('チャットログ解析エラー:', error);
    }

    return sessions;
  }

  /**
   * チームチャットファイルを解析してセッション情報を抽出
   */
  private async parseTeamChatFile(filePath: string): Promise<ClaudeSession | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      // ファイル名から日付を抽出 (YYYY-MM-DD_team-chat.md)
      const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return null;

      const sessionDate = new Date(dateMatch[1]);
      const sessionId = `chat-${dateMatch[1]}`;

      // エージェント活動を抽出
      const activities = this.extractAgentActivitiesFromChat(content, sessionDate);

      const session: ClaudeSession = {
        sessionId,
        startTime: sessionDate,
        endTime: new Date(sessionDate.getTime() + 24 * 60 * 60 * 1000), // 仮の終了時間
        workingDirectory: path.dirname(filePath),
        totalTasks: activities.length,
        completedTasks: activities.filter(a => a.success).length,
        agents: activities
      };

      return session;
    } catch (error) {
      console.error(`チャットファイル解析エラー ${filePath}:`, error);
      return null;
    }
  }

  /**
   * チャット内容からエージェント活動を抽出
   */
  private extractAgentActivitiesFromChat(content: string, sessionDate: Date): AgentActivity[] {
    const activities: AgentActivity[] = [];
    
    // エージェント発言パターンを検索
    const agentPatterns = [
      /\*\*CEO\*\*.*?として/g,
      /\*\*CTO\*\*.*?として/g,
      /\*\*Project Manager\*\*.*?として/g,
      /\*\*Frontend Developer\*\*.*?として/g,
      /\*\*Backend Developer\*\*.*?として/g,
      /\*\*QA Engineer\*\*.*?として/g,
      /\*\*AI Security Specialist\*\*.*?として/g,
      /\*\*Deep Researcher\*\*.*?として/g
    ];

    const agentTypeMap: Record<string, AgentType> = {
      'CEO': 'ceo',
      'CTO': 'cto',
      'Project Manager': 'project-manager',
      'Frontend Developer': 'frontend-developer',
      'Backend Developer': 'backend-developer',
      'QA Engineer': 'qa-engineer',
      'AI Security Specialist': 'ai-security-specialist',
      'Deep Researcher': 'deep-researcher'
    };

    let taskCounter = 1;

    for (const [agentName, agentType] of Object.entries(agentTypeMap)) {
      const pattern = new RegExp(`\\*\\*${agentName}\\*\\*.*?として`, 'g');
      const matches = content.match(pattern);
      
      if (matches) {
        for (const match of matches) {
          const activity: AgentActivity = {
            agentId: agentType,
            agentType,
            taskId: `task-${sessionDate.toISOString().split('T')[0]}-${taskCounter++}`,
            startTime: sessionDate,
            endTime: new Date(sessionDate.getTime() + 60 * 60 * 1000), // 1時間後と仮定
            duration: 3600, // 1時間 = 3600秒
            status: 'completed',
            inputTokens: this.estimateTokens(match),
            outputTokens: this.estimateTokens(match) * 2, // 出力は入力の2倍と仮定
            toolsUsed: this.extractToolsFromText(match),
            files: [],
            success: true
          };
          
          activities.push(activity);
        }
      }
    }

    return activities;
  }

  /**
   * Task実行ログを解析（将来の実装用）
   */
  private async parseTaskLogs(): Promise<ClaudeSession[]> {
    // Task実行の詳細ログがある場合の解析ロジック
    // 現在は空の実装
    return [];
  }

  /**
   * テキストからツールの使用を推定
   */
  private extractToolsFromText(text: string): string[] {
    const tools: string[] = [];
    
    // ツール使用パターンを検索
    if (text.includes('Read') || text.includes('読み取り')) tools.push('Read');
    if (text.includes('Write') || text.includes('書き込み')) tools.push('Write');
    if (text.includes('Edit') || text.includes('編集')) tools.push('Edit');
    if (text.includes('Bash') || text.includes('コマンド')) tools.push('Bash');
    if (text.includes('WebSearch') || text.includes('検索')) tools.push('WebSearch');
    if (text.includes('TodoWrite') || text.includes('タスク')) tools.push('TodoWrite');
    if (text.includes('Grep') || text.includes('検索')) tools.push('Grep');
    if (text.includes('Glob') || text.includes('ファイル検索')) tools.push('Glob');

    return [...new Set(tools)]; // 重複を除去
  }

  /**
   * テキストの概算トークン数を計算
   */
  private estimateTokens(text: string): number {
    // 1トークン ≈ 4文字として概算
    return Math.ceil(text.length / 4);
  }

  /**
   * ログエントリを解析してイベントを抽出
   */
  async parseLogEntries(logContent: string): Promise<LogEntry[]> {
    const entries: LogEntry[] = [];
    const lines = logContent.split('\n');

    for (const line of lines) {
      if (line.trim() === '') continue;

      try {
        // タイムスタンプパターンを検索
        const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/);
        if (!timestampMatch) continue;

        const timestamp = new Date(timestampMatch[1]);
        
        // ログレベルを推定
        let level: 'info' | 'warn' | 'error' | 'debug' = 'info';
        if (line.toLowerCase().includes('error')) level = 'error';
        else if (line.toLowerCase().includes('warn')) level = 'warn';
        else if (line.toLowerCase().includes('debug')) level = 'debug';

        // ソースを推定
        let source: 'claude' | 'agent' | 'system' = 'system';
        if (line.includes('Agent') || line.includes('エージェント')) source = 'agent';
        else if (line.includes('Claude')) source = 'claude';

        const entry: LogEntry = {
          timestamp,
          level,
          source,
          message: line.trim(),
          metadata: {}
        };

        entries.push(entry);
      } catch (error) {
        // ログ行の解析に失敗した場合はスキップ
        continue;
      }
    }

    return entries;
  }

  /**
   * 指定されたディレクトリを監視してリアルタイム解析
   */
  async startWatching(callback: (session: ClaudeSession) => void): Promise<void> {
    // chokidarを使用してファイルシステムを監視
    // 新しいチャットファイルやログファイルが作成されたら解析を実行
    const chokidar = await import('chokidar');
    
    const watcher = chokidar.watch([
      path.join(this.logDirectory, '.claude/chat/**/*.md'),
      path.join(this.logDirectory, '**/*.log')
    ], {
      ignored: /(^|[\/\\])\../, // 隠しファイルを除外
      persistent: true
    });

    watcher.on('add', async (filePath: string) => {
      console.log(`新しいログファイルを検出: ${filePath}`);
      
      if (filePath.endsWith('-team-chat.md')) {
        const session = await this.parseTeamChatFile(filePath);
        if (session) {
          callback(session);
        }
      }
    });

    watcher.on('change', async (filePath: string) => {
      console.log(`ログファイルが更新されました: ${filePath}`);
      
      if (filePath.endsWith('-team-chat.md')) {
        const session = await this.parseTeamChatFile(filePath);
        if (session) {
          callback(session);
        }
      }
    });

    console.log(`ログ監視を開始しました: ${this.logDirectory}`);
  }
}