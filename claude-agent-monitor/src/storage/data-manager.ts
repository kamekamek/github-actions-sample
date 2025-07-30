/**
 * Data Storage Manager
 * ログデータの永続化管理システム
 * セキュリティファーストで高性能なデータ管理を提供
 */

import fs from 'fs-extra';
import path from 'path';
import {
  ClaudeSession,
  AgentActivity,
  LogEntry,
  FilterCriteria,
  AgentType
} from '../types/index.js';
import { performance } from 'perf_hooks';
import { createHash } from 'crypto';

/**
 * ストレージ設定
 */
interface StorageConfig {
  baseDirectory: string;
  compression: boolean;
  encryption: boolean;
  maxFileSize: number; // MB
  retentionDays: number;
  backupEnabled: boolean;
  indexingEnabled: boolean;
  writeBufferSize: number; // バッファサイズ
}

/**
 * データインデックス
 */
interface DataIndex {
  sessions: Map<string, { filePath: string; timestamp: Date; size: number }>;
  agents: Map<string, Set<string>>; // agentId -> sessionIds
  timeRange: Map<string, { start: Date; end: Date }>; // date -> range
  lastUpdated: Date;
}

/**
 * ストレージメトリクス
 */
interface StorageMetrics {
  totalFiles: number;
  totalSize: number; // bytes
  averageFileSize: number;
  oldestRecord: Date;
  newestRecord: Date;
  writeOperations: number;
  readOperations: number;
  lastCleanup: Date;
}

/**
 * バッチ操作アイテム
 */
interface BatchOperation {
  type: 'save' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  priority: 'high' | 'normal' | 'low';
}

/**
 * データマネージャー - 高性能データストレージ管理
 */
export class DataManager {
  private config: StorageConfig;
  private dataIndex: DataIndex;
  private storageMetrics: StorageMetrics;
  private writeBuffer: Map<string, any> = new Map();
  private batchQueue: BatchOperation[] = [];
  private isFlushInProgress: boolean = false;
  private compressionEnabled: boolean;
  private encryptionKey?: Buffer;
  
  // パフォーマンス監視
  private flushInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(config: Partial<StorageConfig> = {}) {
    // デフォルト設定
    this.config = {
      baseDirectory: './data/agent-logs',
      compression: true,
      encryption: false, // セキュリティ要件に応じて有効化
      maxFileSize: 10, // 10MB
      retentionDays: 30,
      backupEnabled: true,
      indexingEnabled: true,
      writeBufferSize: 100, // 100アイテム
      ...config
    };
    
    this.compressionEnabled = this.config.compression;
    
    // データインデックスを初期化
    this.dataIndex = {
      sessions: new Map(),
      agents: new Map(),
      timeRange: new Map(),
      lastUpdated: new Date()
    };
    
    // メトリクスを初期化
    this.storageMetrics = {
      totalFiles: 0,
      totalSize: 0,
      averageFileSize: 0,
      oldestRecord: new Date(),
      newestRecord: new Date(),
      writeOperations: 0,
      readOperations: 0,
      lastCleanup: new Date()
    };
    
    // 初期化処理
    this.initialize();
  }

  /**
   * データマネージャーを初期化
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();
    
    try {
      // ディレクトリを作成
      await this.ensureDirectories();
      
      // 暗号化キーを初期化
      if (this.config.encryption) {
        this.encryptionKey = await this.initializeEncryption();
      }
      
      // インデックスを読み込み
      if (this.config.indexingEnabled) {
        await this.loadDataIndex();
      }
      
      // メトリクスを更新
      await this.updateStorageMetrics();
      
      // 定期的なフラッシュとクリーンアップを開始
      this.startPeriodicOperations();
      
      const elapsedTime = performance.now() - startTime;
      console.log(`[DataManager] 初期化完了: ${elapsedTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('[DataManager] 初期化エラー:', error);
      throw new Error(`データマネージャーの初期化に失敗しました: ${error}`);
    }
  }

  /**
   * セッションデータを保存
   */
  async saveSession(session: ClaudeSession): Promise<void> {
    const startTime = performance.now();
    
    try {
      // ファイルパスを生成
      const filePath = this.generateSessionFilePath(session);
      
      // データをシリアライズ
      const data = await this.serializeData(session);
      
      // メモリバッファに保存（バッチ処理用）
      this.writeBuffer.set(filePath, data);
      
      // インデックスを更新
      if (this.config.indexingEnabled) {
        this.updateSessionIndex(session, filePath);
      }
      
      // バッファが闾値に達したらフラッシュ
      if (this.writeBuffer.size >= this.config.writeBufferSize) {
        await this.flushBuffer();
      }
      
      this.storageMetrics.writeOperations++;
      
      const elapsedTime = performance.now() - startTime;
      console.log(`[DataManager] セッション保存: ${session.sessionId} (${elapsedTime.toFixed(2)}ms)`);
      
    } catch (error) {
      console.error('[DataManager] セッション保存エラー:', error);
      throw error;
    }
  }

  /**
   * セッションデータを更新
   */
  async updateSession(session: ClaudeSession): Promise<void> {
    try {
      // 保存と同じ処理（上書き）
      await this.saveSession(session);
      
      console.log(`[DataManager] セッション更新: ${session.sessionId}`);
      
    } catch (error) {
      console.error('[DataManager] セッション更新エラー:', error);
      throw error;
    }
  }

  /**
   * エージェント活動を保存
   */
  async saveActivity(activity: AgentActivity): Promise<void> {
    const startTime = performance.now();
    
    try {
      // 活動ファイルパスを生成
      const filePath = this.generateActivityFilePath(activity);
      
      // データをシリアライズ
      const data = await this.serializeData(activity);
      
      // バッファに保存
      this.writeBuffer.set(filePath, data);
      
      // エージェントインデックスを更新
      if (this.config.indexingEnabled) {
        this.updateAgentIndex(activity);
      }
      
      this.storageMetrics.writeOperations++;
      
      const elapsedTime = performance.now() - startTime;
      console.log(`[DataManager] 活動保存: ${activity.taskId} (${elapsedTime.toFixed(2)}ms)`);
      
    } catch (error) {
      console.error('[DataManager] 活動保存エラー:', error);
      throw error;
    }
  }

  /**
   * エージェント活動を更新
   */
  async updateActivity(activity: AgentActivity): Promise<void> {
    try {
      // 保存と同じ処理（上書き）
      await this.saveActivity(activity);
      
      console.log(`[DataManager] 活動更新: ${activity.taskId}`);
      
    } catch (error) {
      console.error('[DataManager] 活動更新エラー:', error);
      throw error;
    }
  }

  /**
   * セッションデータを取得
   */
  async getSessions(filters?: FilterCriteria): Promise<ClaudeSession[]> {
    const startTime = performance.now();
    
    try {
      const sessions: ClaudeSession[] = [];
      
      // インデックスを使用して効率的に検索
      if (this.config.indexingEnabled && filters) {
        const candidateFiles = this.getSessionFilesFromIndex(filters);
        
        for (const filePath of candidateFiles) {
          try {
            const sessionData = await this.loadSessionFile(filePath);
            if (sessionData && this.matchesFilter(sessionData, filters)) {
              sessions.push(sessionData);
            }
          } catch (error) {
            console.warn(`[DataManager] セッションファイル読み込みエラー: ${filePath}`, error);
          }
        }
      } else {
        // 全ファイルをスキャン（非効率的）
        const sessionFiles = await this.getAllSessionFiles();
        
        for (const filePath of sessionFiles) {
          try {
            const sessionData = await this.loadSessionFile(filePath);
            if (sessionData && (!filters || this.matchesFilter(sessionData, filters))) {
              sessions.push(sessionData);
            }
          } catch (error) {
            console.warn(`[DataManager] セッションファイル読み込みエラー: ${filePath}`, error);
          }
        }
      }
      
      // 時間順にソート
      sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      
      this.storageMetrics.readOperations++;
      
      const elapsedTime = performance.now() - startTime;
      console.log(`[DataManager] セッション取得: ${sessions.length}件 (${elapsedTime.toFixed(2)}ms)`);
      
      return sessions;
      
    } catch (error) {
      console.error('[DataManager] セッション取得エラー:', error);
      throw error;
    }
  }

  /**
   * エージェント活動を取得
   */
  async getActivities(
    sessionId?: string,
    agentId?: string,
    filters?: FilterCriteria
  ): Promise<AgentActivity[]> {
    const startTime = performance.now();
    
    try {
      const activities: AgentActivity[] = [];
      
      // 活動ファイルを検索
      const activityFiles = await this.getActivityFiles(sessionId, agentId);
      
      for (const filePath of activityFiles) {
        try {
          const activityData = await this.loadActivityFile(filePath);
          if (activityData && (!filters || this.matchesActivityFilter(activityData, filters))) {
            activities.push(activityData);
          }
        } catch (error) {
          console.warn(`[DataManager] 活動ファイル読み込みエラー: ${filePath}`, error);
        }
      }
      
      // 時間順にソート
      activities.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      
      this.storageMetrics.readOperations++;
      
      const elapsedTime = performance.now() - startTime;
      console.log(`[DataManager] 活動取得: ${activities.length}件 (${elapsedTime.toFixed(2)}ms)`);
      
      return activities;
      
    } catch (error) {
      console.error('[DataManager] 活動取得エラー:', error);
      throw error;
    }
  }

  /**
   * バッファをフラッシュ（ディスクに書き込み）
   */
  async flush(): Promise<void> {
    if (this.isFlushInProgress) {
      return; // 既にフラッシュ中
    }
    
    await this.flushBuffer();
  }

  /**
   * ストレージメトリクスを取得
   */
  getStorageMetrics(): StorageMetrics {
    return { ...this.storageMetrics };
  }

  /**
   * データクリーンアップを実行
   */
  async cleanup(): Promise<void> {
    const startTime = performance.now();
    
    try {
      const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
      let deletedFiles = 0;
      let freedSpace = 0;
      
      // 期限切れファイルを削除
      const allFiles = await this.getAllDataFiles();
      
      for (const filePath of allFiles) {
        try {
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            freedSpace += stats.size;
            await fs.remove(filePath);
            deletedFiles++;
            
            // インデックスからも削除
            this.removeFromIndex(filePath);
          }
        } catch (error) {
          console.warn(`[DataManager] ファイル削除エラー: ${filePath}`, error);
        }
      }
      
      // メトリクスを更新
      this.storageMetrics.totalFiles -= deletedFiles;
      this.storageMetrics.totalSize -= freedSpace;
      this.storageMetrics.lastCleanup = new Date();
      
      // インデックスを保存
      if (this.config.indexingEnabled) {
        await this.saveDataIndex();
      }
      
      const elapsedTime = performance.now() - startTime;
      console.log(`[DataManager] クリーンアップ完了: ${deletedFiles}ファイル削除, ${this.formatBytes(freedSpace)}解放 (${elapsedTime.toFixed(2)}ms)`);
      
    } catch (error) {
      console.error('[DataManager] クリーンアップエラー:', error);
      throw error;
    }
  }

  /**
   * データマネージャーを終了
   */
  async shutdown(): Promise<void> {
    console.log('[DataManager] シャットダウン開始...');
    
    try {
      // 定期操作を停止
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
      }
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      
      // 最終フラッシュ
      await this.flush();
      
      // インデックスを保存
      if (this.config.indexingEnabled) {
        await this.saveDataIndex();
      }
      
      console.log('[DataManager] シャットダウン完了');
      
    } catch (error) {
      console.error('[DataManager] シャットダウンエラー:', error);
      throw error;
    }
  }

  // プライベートメソッド

  /**
   * 必要なディレクトリを作成
   */
  private async ensureDirectories(): Promise<void> {
    const directories = [
      this.config.baseDirectory,
      path.join(this.config.baseDirectory, 'sessions'),
      path.join(this.config.baseDirectory, 'activities'),
      path.join(this.config.baseDirectory, 'logs'),
      path.join(this.config.baseDirectory, 'backups'),
      path.join(this.config.baseDirectory, 'indexes')
    ];
    
    for (const dir of directories) {
      await fs.ensureDir(dir);
    }
  }

  /**
   * 暗号化キーを初期化
   */
  private async initializeEncryption(): Promise<Buffer> {
    // 簡易的な暗号化キー生成（実際にはより安全な方法を使用）
    const keyPath = path.join(this.config.baseDirectory, '.encryption-key');
    
    if (await fs.pathExists(keyPath)) {
      return await fs.readFile(keyPath);
    } else {
      // 新しいキーを生成
      const key = Buffer.from(createHash('sha256').update(Date.now().toString()).digest());
      await fs.writeFile(keyPath, key, { mode: 0o600 }); // 所有者のみ読み取り可能
      return key;
    }
  }

  /**
   * データインデックスを読み込み
   */
  private async loadDataIndex(): Promise<void> {
    const indexPath = path.join(this.config.baseDirectory, 'indexes', 'data-index.json');
    
    try {
      if (await fs.pathExists(indexPath)) {
        const indexData = await fs.readJson(indexPath);
        
        // Mapオブジェクトを復元
        this.dataIndex.sessions = new Map(indexData.sessions);
        this.dataIndex.agents = new Map(
          Object.entries(indexData.agents).map(([k, v]) => [k, new Set(v as string[])])
        );
        this.dataIndex.timeRange = new Map(
          Object.entries(indexData.timeRange).map(([k, v]) => [
            k,
            {
              start: new Date((v as any).start),
              end: new Date((v as any).end)
            }
          ])
        );
        this.dataIndex.lastUpdated = new Date(indexData.lastUpdated);
        
        console.log('[DataManager] データインデックス読み込み完了');
      } else {
        console.log('[DataManager] データインデックスが存在しないため、新規作成します');
        await this.rebuildDataIndex();
      }
    } catch (error) {
      console.warn('[DataManager] インデックス読み込みエラー、再構築します:', error);
      await this.rebuildDataIndex();
    }
  }

  /**
   * データインデックスを保存
   */
  private async saveDataIndex(): Promise<void> {
    const indexPath = path.join(this.config.baseDirectory, 'indexes', 'data-index.json');
    
    try {
      const indexData = {
        sessions: Array.from(this.dataIndex.sessions.entries()),
        agents: Object.fromEntries(
          Array.from(this.dataIndex.agents.entries()).map(([k, v]) => [k, Array.from(v)])
        ),
        timeRange: Object.fromEntries(
          Array.from(this.dataIndex.timeRange.entries())
        ),
        lastUpdated: this.dataIndex.lastUpdated
      };
      
      await fs.writeJson(indexPath, indexData, { spaces: 2 });
      
    } catch (error) {
      console.error('[DataManager] インデックス保存エラー:', error);
    }
  }

  /**
   * データインデックスを再構築
   */
  private async rebuildDataIndex(): Promise<void> {
    console.log('[DataManager] データインデックスを再構築中...');
    
    try {
      // インデックスをリセット
      this.dataIndex.sessions.clear();
      this.dataIndex.agents.clear();
      this.dataIndex.timeRange.clear();
      
      // 全セッションファイルをスキャン
      const sessionFiles = await this.getAllSessionFiles();
      
      for (const filePath of sessionFiles) {
        try {
          const session = await this.loadSessionFile(filePath);
          if (session) {
            this.updateSessionIndex(session, filePath);
          }
        } catch (error) {
          console.warn(`[DataManager] ファイルスキャンエラー: ${filePath}`, error);
        }
      }
      
      this.dataIndex.lastUpdated = new Date();
      await this.saveDataIndex();
      
      console.log('[DataManager] データインデックス再構築完了');
      
    } catch (error) {
      console.error('[DataManager] インデックス再構築エラー:', error);
    }
  }

  /**
   * セッションインデックスを更新
   */
  private updateSessionIndex(session: ClaudeSession, filePath: string): void {
    // セッションインデックス
    this.dataIndex.sessions.set(session.sessionId, {
      filePath,
      timestamp: session.startTime,
      size: 0 // ファイルサイズは後で更新
    });
    
    // エージェントインデックス
    for (const activity of session.agents) {
      if (!this.dataIndex.agents.has(activity.agentId)) {
        this.dataIndex.agents.set(activity.agentId, new Set());
      }
      this.dataIndex.agents.get(activity.agentId)!.add(session.sessionId);
    }
    
    // 時間範囲インデックス
    const dateKey = session.startTime.toISOString().split('T')[0];
    const existing = this.dataIndex.timeRange.get(dateKey);
    
    if (!existing) {
      this.dataIndex.timeRange.set(dateKey, {
        start: session.startTime,
        end: session.endTime || session.startTime
      });
    } else {
      if (session.startTime < existing.start) {
        existing.start = session.startTime;
      }
      if (session.endTime && session.endTime > existing.end) {
        existing.end = session.endTime;
      }
    }
  }

  /**
   * エージェントインデックスを更新
   */
  private updateAgentIndex(activity: AgentActivity): void {
    // 簡略化されたエージェントインデックス更新
    // 実際の実装では活動固有のインデックスも追加可能
  }

  /**
   * ストレージメトリクスを更新
   */
  private async updateStorageMetrics(): Promise<void> {
    try {
      const allFiles = await this.getAllDataFiles();
      let totalSize = 0;
      let oldestRecord = new Date();
      let newestRecord = new Date(0);
      
      for (const filePath of allFiles) {
        try {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
          
          if (stats.mtime < oldestRecord) {
            oldestRecord = stats.mtime;
          }
          if (stats.mtime > newestRecord) {
            newestRecord = stats.mtime;
          }
        } catch (error) {
          // ファイルアクセスエラーはスキップ
        }
      }
      
      this.storageMetrics.totalFiles = allFiles.length;
      this.storageMetrics.totalSize = totalSize;
      this.storageMetrics.averageFileSize = allFiles.length > 0 ? totalSize / allFiles.length : 0;
      this.storageMetrics.oldestRecord = oldestRecord;
      this.storageMetrics.newestRecord = newestRecord;
      
    } catch (error) {
      console.warn('[DataManager] メトリクス更新エラー:', error);
    }
  }

  /**
   * 定期的な操作を開始
   */
  private startPeriodicOperations(): void {
    // 30秒ごとにフラッシュ
    this.flushInterval = setInterval(async () => {
      try {
        await this.flush();
      } catch (error) {
        console.error('[DataManager] 定期フラッシュエラー:', error);
      }
    }, 30000);
    
    // 1時間ごとにクリーンアップ
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        console.error('[DataManager] 定期クリーンアップエラー:', error);
      }
    }, 3600000);
  }

  /**
   * ファイルパスを生成
   */
  private generateSessionFilePath(session: ClaudeSession): string {
    const date = session.startTime.toISOString().split('T')[0];
    const sanitizedId = session.sessionId.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.config.baseDirectory, 'sessions', date, `${sanitizedId}.json`);
  }

  private generateActivityFilePath(activity: AgentActivity): string {
    const date = activity.startTime.toISOString().split('T')[0];
    const sanitizedTaskId = activity.taskId.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.config.baseDirectory, 'activities', activity.agentId, date, `${sanitizedTaskId}.json`);
  }

  /**
   * データをシリアライズ
   */
  private async serializeData(data: any): Promise<string> {
    const jsonData = JSON.stringify(data, null, this.compressionEnabled ? 0 : 2);
    
    // 暗号化が有効な場合
    if (this.config.encryption && this.encryptionKey) {
      // 簡易的な暗号化実装（実際にはより安全な手法を使用）
      return Buffer.from(jsonData).toString('base64');
    }
    
    return jsonData;
  }

  /**
   * データをデシリアライズ
   */
  private async deserializeData(serializedData: string): Promise<any> {
    let jsonData = serializedData;
    
    // 暗号化が有効な場合
    if (this.config.encryption && this.encryptionKey) {
      jsonData = Buffer.from(serializedData, 'base64').toString('utf-8');
    }
    
    return JSON.parse(jsonData);
  }

  /**
   * バッファをフラッシュ
   */
  private async flushBuffer(): Promise<void> {
    if (this.isFlushInProgress || this.writeBuffer.size === 0) {
      return;
    }
    
    this.isFlushInProgress = true;
    const startTime = performance.now();
    
    try {
      const writePromises: Promise<void>[] = [];
      
      for (const [filePath, data] of this.writeBuffer) {
        writePromises.push(this.writeToFile(filePath, data));
      }
      
      await Promise.all(writePromises);
      
      const writtenFiles = this.writeBuffer.size;
      this.writeBuffer.clear();
      
      const elapsedTime = performance.now() - startTime;
      console.log(`[DataManager] バッファフラッシュ完了: ${writtenFiles}ファイル (${elapsedTime.toFixed(2)}ms)`);
      
    } catch (error) {
      console.error('[DataManager] バッファフラッシュエラー:', error);
      throw error;
    } finally {
      this.isFlushInProgress = false;
    }
  }

  /**
   * ファイルに書き込み
   */
  private async writeToFile(filePath: string, data: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, data, 'utf-8');
    } catch (error) {
      console.error(`[DataManager] ファイル書き込みエラー: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * セッションファイルを読み込み
   */
  private async loadSessionFile(filePath: string): Promise<ClaudeSession | null> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const sessionData = await this.deserializeData(data);
      
      // 日付フィールドをDateオブジェクトに変換
      sessionData.startTime = new Date(sessionData.startTime);
      if (sessionData.endTime) {
        sessionData.endTime = new Date(sessionData.endTime);
      }
      
      // エージェント活動の日付も変換
      for (const activity of sessionData.agents) {
        activity.startTime = new Date(activity.startTime);
        if (activity.endTime) {
          activity.endTime = new Date(activity.endTime);
        }
        
        // ファイル操作の日付も変換
        for (const fileOp of activity.files) {
          fileOp.timestamp = new Date(fileOp.timestamp);
        }
      }
      
      return sessionData;
      
    } catch (error) {
      console.warn(`[DataManager] セッションファイル読み込みエラー: ${filePath}`, error);
      return null;
    }
  }

  /**
   * 活動ファイルを読み込み
   */
  private async loadActivityFile(filePath: string): Promise<AgentActivity | null> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const activityData = await this.deserializeData(data);
      
      // 日付フィールドをDateオブジェクトに変換
      activityData.startTime = new Date(activityData.startTime);
      if (activityData.endTime) {
        activityData.endTime = new Date(activityData.endTime);
      }
      
      // ファイル操作の日付も変換
      for (const fileOp of activityData.files) {
        fileOp.timestamp = new Date(fileOp.timestamp);
      }
      
      return activityData;
      
    } catch (error) {
      console.warn(`[DataManager] 活動ファイル読み込みエラー: ${filePath}`, error);
      return null;
    }
  }

  /**
   * 全セッションファイルを取得
   */
  private async getAllSessionFiles(): Promise<string[]> {
    const sessionDir = path.join(this.config.baseDirectory, 'sessions');
    const files: string[] = [];
    
    try {
      if (await fs.pathExists(sessionDir)) {
        const walkDir = async (dir: string) => {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
              await walkDir(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.json')) {
              files.push(fullPath);
            }
          }
        };
        
        await walkDir(sessionDir);
      }
    } catch (error) {
      console.warn('[DataManager] セッションファイル取得エラー:', error);
    }
    
    return files;
  }

  /**
   * 活動ファイルを取得
   */
  private async getActivityFiles(
    sessionId?: string,
    agentId?: string
  ): Promise<string[]> {
    const activityDir = path.join(this.config.baseDirectory, 'activities');
    const files: string[] = [];
    
    try {
      if (await fs.pathExists(activityDir)) {
        const walkDir = async (dir: string) => {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
              // agentIdでフィルタリング
              if (!agentId || path.basename(fullPath) === agentId) {
                await walkDir(fullPath);
              }
            } else if (entry.isFile() && entry.name.endsWith('.json')) {
              files.push(fullPath);
            }
          }
        };
        
        await walkDir(activityDir);
      }
    } catch (error) {
      console.warn('[DataManager] 活動ファイル取得エラー:', error);
    }
    
    return files;
  }

  /**
   * 全データファイルを取得
   */
  private async getAllDataFiles(): Promise<string[]> {
    const sessionFiles = await this.getAllSessionFiles();
    const activityFiles = await this.getActivityFiles();
    return [...sessionFiles, ...activityFiles];
  }

  /**
   * インデックスからセッションファイルを取得
   */
  private getSessionFilesFromIndex(filters: FilterCriteria): string[] {
    const files: string[] = [];
    
    // エージェントフィルター
    if (filters.agents && filters.agents.length > 0) {
      const sessionIds = new Set<string>();
      
      for (const agentId of filters.agents) {
        const agentSessions = this.dataIndex.agents.get(agentId);
        if (agentSessions) {
          for (const sessionId of agentSessions) {
            sessionIds.add(sessionId);
          }
        }
      }
      
      for (const sessionId of sessionIds) {
        const sessionInfo = this.dataIndex.sessions.get(sessionId);
        if (sessionInfo) {
          files.push(sessionInfo.filePath);
        }
      }
    } else {
      // 全セッション
      for (const sessionInfo of this.dataIndex.sessions.values()) {
        files.push(sessionInfo.filePath);
      }
    }
    
    return files;
  }

  /**
   * フィルター条件にマッチするかチェック
   */
  private matchesFilter(session: ClaudeSession, filters: FilterCriteria): boolean {
    // 時間範囲フィルター
    if (filters.timeRange) {
      if (session.startTime < filters.timeRange.start || 
          session.startTime > filters.timeRange.end) {
        return false;
      }
    }
    
    // エージェントフィルター
    if (filters.agents && filters.agents.length > 0) {
      const sessionAgents = session.agents.map(a => a.agentId);
      const hasAgent = filters.agents.some(agentId => sessionAgents.includes(agentId));
      if (!hasAgent) {
        return false;
      }
    }
    
    // ステータスフィルター
    if (filters.status && filters.status.length > 0) {
      const sessionStatuses = session.agents.map(a => a.status);
      const hasStatus = filters.status.some(status => sessionStatuses.includes(status));
      if (!hasStatus) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 活動フィルター条件にマッチするかチェック
   */
  private matchesActivityFilter(activity: AgentActivity, filters: FilterCriteria): boolean {
    // 時間範囲フィルター
    if (filters.timeRange) {
      if (activity.startTime < filters.timeRange.start || 
          activity.startTime > filters.timeRange.end) {
        return false;
      }
    }
    
    // エージェントフィルター
    if (filters.agents && filters.agents.length > 0) {
      if (!filters.agents.includes(activity.agentId)) {
        return false;
      }
    }
    
    // ステータスフィルター
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(activity.status)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * インデックスからファイルを削除
   */
  private removeFromIndex(filePath: string): void {
    // セッションインデックスから削除
    for (const [sessionId, info] of this.dataIndex.sessions) {
      if (info.filePath === filePath) {
        this.dataIndex.sessions.delete(sessionId);
        break;
      }
    }
  }

  /**
   * バイト数をフォーマット
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}