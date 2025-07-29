/**
 * Jest Test Setup Configuration
 * QA Engineer設計 - テスト環境セットアップ
 * 
 * @author QA Engineer
 * @security Secure test environment configuration
 */

import dotenv from 'dotenv';

// テスト環境用の環境変数読み込み
dotenv.config({ path: '.env.test' });

// グローバルテストタイムアウト設定
jest.setTimeout(30000);

// テスト環境変数の設定
process.env.NODE_ENV = 'test';
process.env.GITHUB_TOKEN = 'test-token-for-mocking';
process.env.GITHUB_OWNER = 'test-owner';
process.env.GITHUB_REPO = 'test-repo';

// コンソールエラーを抑制（テストノイズの削減）
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// 各テスト実行前の共通セットアップ
beforeEach(() => {
  // モックのリセット
  jest.clearAllMocks();
  jest.clearAllTimers();
  
  // 日付モックのリセット
  jest.useRealTimers();
});

// 各テスト実行後のクリーンアップ
afterEach(() => {
  // リソースのクリーンアップ
  jest.restoreAllMocks();
});

// 未処理のPromise拒否をキャッチ
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// プロセス警告の処理
process.on('warning', (warning) => {
  if (!warning.message.includes('ExperimentalWarning')) {
    console.warn('Warning:', warning.message);
  }
});

// グローバルテストヘルパー
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
      toHaveValidGitHubFormat(): R;
    }
  }
}

// カスタムマッチャーの定義
expect.extend({
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      message: () => `expected ${received} to be a valid Date`,
      pass,
    };
  },
  
  toHaveValidGitHubFormat(received: string) {
    const githubRepoPattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
    const pass = typeof received === 'string' && githubRepoPattern.test(received);
    return {
      message: () => `expected ${received} to have valid GitHub repository format (owner/repo)`,
      pass,
    };
  }
});

export {};