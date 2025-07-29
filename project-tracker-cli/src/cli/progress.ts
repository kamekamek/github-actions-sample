/**
 * Progress Manager - 美しいプログレス表示とローディングアニメーション
 * フロントエンド開発者によるユーザー体験最適化
 * 
 * @author Frontend Developer - AI Virtual Corporation
 * @focus Progress visualization, loading states, user feedback
 */

import ora, { Ora } from 'ora';
import chalk from 'chalk';

/**
 * プログレス管理クラス
 * ユーザーにとって明確で美しいフィードバックを提供
 */
export class ProgressManager {
  private spinner: Ora;
  private steps: string[];
  private currentStep: number = 0;
  private taskName: string;
  private startTime: number;

  constructor(taskName: string, steps: string[]) {
    this.taskName = taskName;
    this.steps = steps;
    this.startTime = Date.now();
    
    // 美しいスピナーアニメーションを選択
    this.spinner = ora({
      text: this.formatInitialMessage(),
      spinner: 'dots12',
      color: 'blue'
    });
  }

  /**
   * プフォーマンストラッキング開始
   */
  start(): void {
    this.spinner.start();
  }

  /**
   * 次のステップに進む
   */
  next(customMessage?: string): void {
    if (this.currentStep < this.steps.length) {
      this.currentStep++;
      const message = customMessage || this.steps[this.currentStep - 1];
      const progressText = this.formatProgressMessage(message);
      this.spinner.text = progressText;
    }
  }

  /**
   * タスク完了
   */
  complete(customMessage?: string): void {
    const duration = this.formatDuration(Date.now() - this.startTime);
    const message = customMessage || `${this.taskName}が完了しました`;
    this.spinner.succeed(chalk.green(`✅ ${message} ${chalk.gray(`(${duration})`)}}`));
  }

  /**
   * タスク失敗
   */
  fail(customMessage?: string): void {
    const duration = this.formatDuration(Date.now() - this.startTime);
    const message = customMessage || `${this.taskName}に失敗しました`;
    this.spinner.fail(chalk.red(`❌ ${message} ${chalk.gray(`(${duration})`)}}`));
  }

  /**
   * 警告メッセージ
   */
  warn(message: string): void {
    this.spinner.warn(chalk.yellow(`⚠️  ${message}`));
  }

  /**
   * 情報メッセージ
   */
  info(message: string): void {
    this.spinner.info(chalk.blue(`📊 ${message}`));
  }

  /**
   * 手動テキスト更新
   */
  updateText(text: string): void {
    this.spinner.text = this.formatProgressMessage(text);
  }

  /**
   * スピナーの一時停止
   */
  pause(): void {
    this.spinner.stop();
  }

  /**
   * スピナーの再開
   */
  resume(): void {
    this.spinner.start();
  }

  /**
   * 初期メッセージのフォーマット
   */
  private formatInitialMessage(): string {
    const totalSteps = this.steps.length;
    return chalk.blue(`🚀 ${this.taskName}を開始しています... (${totalSteps}ステップ)`);
  }

  /**
   * プログレスメッセージのフォーマット
   */
  private formatProgressMessage(message: string): string {
    const progress = `${this.currentStep}/${this.steps.length}`;
    const progressBar = this.createProgressBar();
    const elapsed = this.formatDuration(Date.now() - this.startTime);
    
    return `${chalk.cyan(progressBar)} ${chalk.blue(message)} ${chalk.gray(`[${progress}] (${elapsed})`)}}`;
  }

  /**
   * プログレスバーの作成
   */
  private createProgressBar(): string {
    const totalSteps = this.steps.length;
    const completed = this.currentStep;
    const barLength = 10;
    
    const filled = Math.floor((completed / totalSteps) * barLength);
    const empty = barLength - filled;
    
    let bar = '[';
    for (let i = 0; i < filled; i++) {
      bar += '█';
    }
    for (let i = 0; i < empty; i++) {
      bar += '░';
    }
    bar += ']';
    
    return bar;
  }

  /**
   * 経過時間のフォーマット
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    
    if (seconds < 1) {
      return `${ms}ms`;
    } else if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
  }

  /**
   * ステップ一覧の取得
   */
  getSteps(): string[] {
    return [...this.steps];
  }

  /**
   * 現在のステップ番号取得
   */
  getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * 進捗率の取得（パーセント）
   */
  getProgress(): number {
    return Math.round((this.currentStep / this.steps.length) * 100);
  }
}

/**
 * 簡易プログレスバー関数
 * 単発のタスク用
 */
export function createSimpleSpinner(message: string, color: 'blue' | 'green' | 'yellow' | 'red' = 'blue'): Ora {
  return ora({
    text: chalk[color](message),
    spinner: 'dots',
    color
  });
}

/**
 * ファイル操作用プログレスバー
 */
export function createFileProgressSpinner(filename: string, operation: 'reading' | 'writing' | 'processing'): Ora {
  const operations = {
    reading: '📄 読み込み中',
    writing: '💾 書き込み中',
    processing: '⚙️  処理中'
  };
  
  const message = `${operations[operation]}: ${chalk.cyan(filename)}`;
  
  return ora({
    text: message,
    spinner: 'bouncingBar',
    color: 'cyan'
  });
}

/**
 * ネットワーク通信用プログレスバー
 */
export function createNetworkSpinner(endpoint: string): Ora {
  return ora({
    text: `🌐 API通信中: ${chalk.gray(endpoint)}`,
    spinner: 'earth',
    color: 'green'
  });
}