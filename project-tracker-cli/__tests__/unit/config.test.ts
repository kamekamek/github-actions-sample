/**
 * Configuration Utilities Unit Tests
 * QA Engineer設計 - 設定管理のユニットテスト
 * 
 * @author QA Engineer
 * @security Testing secure configuration handling
 */

import { 
  createGitHubConfig, 
  createDefaultAnalysisConfig, 
  validateEnvironment 
} from '../../src/utils/config.js';

describe('Configuration Utilities', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createGitHubConfig', () => {
    beforeEach(() => {
      process.env.GITHUB_TOKEN = 'test-token-123';
    });

    it('基本的なGitHub設定を正しく作成する', () => {
      const config = createGitHubConfig('test-owner', 'test-repo');

      expect(config.token).toBe('test-token-123');
      expect(config.owner).toBe('test-owner');
      expect(config.repo).toBe('test-repo');
      expect(config.base_url).toBe('https://api.github.com');
      expect(config.timeout_ms).toBe(30000);
      expect(config.retry_attempts).toBe(3);
      expect(config.rate_limit_buffer).toBe(100);
    });

    it('カスタムbaseURLが適用される', () => {
      process.env.GITHUB_API_URL = 'https://github.enterprise.com/api/v3';
      
      const config = createGitHubConfig('enterprise-owner', 'enterprise-repo');

      expect(config.base_url).toBe('https://github.enterprise.com/api/v3');
      expect(config.owner).toBe('enterprise-owner');
      expect(config.repo).toBe('enterprise-repo');
    });

    it('空のトークンでエラーが発生する', () => {
      process.env.GITHUB_TOKEN = '';

      expect(() => createGitHubConfig('owner', 'repo')).toThrow();
    });

    it('未定義のトークンでエラーが発生する', () => {
      delete process.env.GITHUB_TOKEN;

      expect(() => createGitHubConfig('owner', 'repo')).toThrow();
    });

    it('不正なowner/repo形式を検証する', () => {
      expect(() => createGitHubConfig('', 'repo')).toThrow();
      expect(() => createGitHubConfig('owner', '')).toThrow();
      expect(() => createGitHubConfig('owner<script>', 'repo')).toThrow();
      expect(() => createGitHubConfig('owner', 'repo<script>')).toThrow();
    });

    it('特殊文字を含むowner/repoを適切に処理する', () => {
      const config = createGitHubConfig('test-owner', 'test_repo.name');

      expect(config.owner).toBe('test-owner');
      expect(config.repo).toBe('test_repo.name');
    });

    it('環境変数からタイムアウト設定を読み取る', () => {
      process.env.GITHUB_TIMEOUT_MS = '60000';

      const config = createGitHubConfig('owner', 'repo');

      expect(config.timeout_ms).toBe(60000);
    });

    it('環境変数からリトライ回数を読み取る', () => {
      process.env.GITHUB_RETRY_ATTEMPTS = '5';

      const config = createGitHubConfig('owner', 'repo');

      expect(config.retry_attempts).toBe(5);
    });

    it('不正な数値設定にデフォルト値を使用する', () => {
      process.env.GITHUB_TIMEOUT_MS = 'invalid';
      process.env.GITHUB_RETRY_ATTEMPTS = 'not-a-number';

      const config = createGitHubConfig('owner', 'repo');

      expect(config.timeout_ms).toBe(30000); // デフォルト値
      expect(config.retry_attempts).toBe(3); // デフォルト値
    });
  });

  describe('createDefaultAnalysisConfig', () => {
    it('デフォルトの分析設定を作成する', () => {
      const config = createDefaultAnalysisConfig();

      expect(config.time_range_days).toBe(30);
      expect(config.include_weekends).toBe(true);
      expect(config.exclude_merge_commits).toBe(false);
      expect(config.minimum_commit_message_length).toBe(10);
      
      // 健康度重みの合計が1になることを確認
      const totalWeight = Object.values(config.health_score_weights).reduce((sum, weight) => sum + weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 10);
    });

    it('健康度重みが正しく設定される', () => {
      const config = createDefaultAnalysisConfig();

      expect(config.health_score_weights.activity).toBe(0.3);
      expect(config.health_score_weights.code_quality).toBe(0.3);
      expect(config.health_score_weights.collaboration).toBe(0.2);
      expect(config.health_score_weights.issue_management).toBe(0.2);
    });

    it('環境変数から設定をオーバーライドする', () => {
      process.env.ANALYSIS_TIME_RANGE_DAYS = '60';
      process.env.ANALYSIS_EXCLUDE_MERGE_COMMITS = 'true';
      process.env.ANALYSIS_MIN_COMMIT_MESSAGE_LENGTH = '20';

      const config = createDefaultAnalysisConfig();

      expect(config.time_range_days).toBe(60);
      expect(config.exclude_merge_commits).toBe(true);
      expect(config.minimum_commit_message_length).toBe(20);
    });

    it('不正な環境変数を無視してデフォルトを使用する', () => {
      process.env.ANALYSIS_TIME_RANGE_DAYS = 'invalid';
      process.env.ANALYSIS_EXCLUDE_MERGE_COMMITS = 'not-boolean';
      process.env.ANALYSIS_MIN_COMMIT_MESSAGE_LENGTH = 'negative';

      const config = createDefaultAnalysisConfig();

      expect(config.time_range_days).toBe(30);
      expect(config.exclude_merge_commits).toBe(false);
      expect(config.minimum_commit_message_length).toBe(10);
    });

    it('健康度重み設定が環境変数から読み込まれる', () => {
      process.env.ANALYSIS_WEIGHT_ACTIVITY = '0.4';
      process.env.ANALYSIS_WEIGHT_CODE_QUALITY = '0.3';
      process.env.ANALYSIS_WEIGHT_COLLABORATION = '0.2';
      process.env.ANALYSIS_WEIGHT_ISSUE_MANAGEMENT = '0.1';

      const config = createDefaultAnalysisConfig();

      expect(config.health_score_weights.activity).toBe(0.4);
      expect(config.health_score_weights.code_quality).toBe(0.3);
      expect(config.health_score_weights.collaboration).toBe(0.2);
      expect(config.health_score_weights.issue_management).toBe(0.1);
    });

    it('範囲外の値が正規化される', () => {
      process.env.ANALYSIS_TIME_RANGE_DAYS = '500'; // 365日を超える
      process.env.ANALYSIS_MIN_COMMIT_MESSAGE_LENGTH = '-5'; // 負の値

      const config = createDefaultAnalysisConfig();

      expect(config.time_range_days).toBeLessThanOrEqual(365);
      expect(config.minimum_commit_message_length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateEnvironment', () => {
    it('必要な環境変数が設定されている場合は成功する', () => {
      process.env.GITHUB_TOKEN = 'valid-token';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('GitHubトークンが未設定の場合はエラーを投げる', () => {
      delete process.env.GITHUB_TOKEN;

      expect(() => validateEnvironment()).toThrow('GitHub token is required');
    });

    it('空のGitHubトークンでエラーを投げる', () => {
      process.env.GITHUB_TOKEN = '';

      expect(() => validateEnvironment()).toThrow();
    });

    it('GitHubトークンの形式を検証する', () => {
      // 短すぎるトークン
      process.env.GITHUB_TOKEN = 'abc';

      expect(() => validateEnvironment()).toThrow();
    });

    it('危険な文字列を含むトークンを拒否する', () => {
      process.env.GITHUB_TOKEN = 'token<script>alert("xss")</script>';

      expect(() => validateEnvironment()).toThrow();
    });

    it('Node環境を正しく検証する', () => {
      const originalPlatform = process.platform;
      const originalVersion = process.version;

      // Node.jsバージョンチェック（最小バージョン要件）
      expect(process.version).toMatch(/^v\d+\.\d+\.\d+/);
      expect(parseInt(process.version.slice(1))).toBeGreaterThanOrEqual(16);
    });

    it('オプショナルな環境変数の検証', () => {
      process.env.GITHUB_TOKEN = 'valid-token';
      process.env.GITHUB_API_URL = 'https://api.github.com';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('不正なAPIベースURLを検証する', () => {
      process.env.GITHUB_TOKEN = 'valid-token';
      process.env.GITHUB_API_URL = 'http://insecure-api.com'; // HTTPは許可しない

      expect(() => validateEnvironment()).toThrow();
    });

    it('デバッグモードの環境変数を処理する', () => {
      process.env.GITHUB_TOKEN = 'valid-token';
      process.env.DEBUG = 'true';
      process.env.NODE_ENV = 'development';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('プロダクション環境での追加検証', () => {
      process.env.GITHUB_TOKEN = 'valid-production-token';
      process.env.NODE_ENV = 'production';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('テスト環境での緩い検証', () => {
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.NODE_ENV = 'test';

      expect(() => validateEnvironment()).not.toThrow();
    });
  });

  describe('Configuration Security', () => {
    it('設定値のサニタイズが適用される', () => {
      process.env.GITHUB_TOKEN = 'token-with-newlines\n\r\t';

      const config = createGitHubConfig('owner', 'repo');

      expect(config.token).not.toContain('\n');
      expect(config.token).not.toContain('\r');
      expect(config.token).not.toContain('\t');
    });

    it('機密情報がログに出力されない', () => {
      const originalLog = console.log;
      const logMessages: string[] = [];
      
      console.log = (...args: any[]) => {
        logMessages.push(args.join(' '));
      };

      try {
        process.env.GITHUB_TOKEN = 'secret-token-123';
        createGitHubConfig('owner', 'repo');

        // ログにトークンが含まれていないことを確認
        const hasSecretInLogs = logMessages.some(msg => msg.includes('secret-token-123'));
        expect(hasSecretInLogs).toBe(false);
      } finally {
        console.log = originalLog;
      }
    });

    it('設定のクローンが安全に作成される', () => {
      process.env.GITHUB_TOKEN = 'original-token';
      
      const config1 = createGitHubConfig('owner1', 'repo1');
      const config2 = createGitHubConfig('owner2', 'repo2');

      // 設定が独立していることを確認
      expect(config1.owner).toBe('owner1');
      expect(config2.owner).toBe('owner2');
      expect(config1.repo).toBe('repo1');
      expect(config2.repo).toBe('repo2');
    });

    it('設定の不変性が保証される', () => {
      process.env.GITHUB_TOKEN = 'immutable-token';
      
      const config = createGitHubConfig('owner', 'repo');

      // readonlyプロパティの変更を試みる
      expect(() => {
        (config as any).token = 'modified-token';
      }).toThrow();
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('部分的な環境変数設定を処理する', () => {
      process.env.GITHUB_TOKEN = 'partial-token';
      process.env.GITHUB_TIMEOUT_MS = '45000';
      // GITHUB_RETRY_ATTEMPTSは未設定

      const config = createGitHubConfig('owner', 'repo');

      expect(config.timeout_ms).toBe(45000);
      expect(config.retry_attempts).toBe(3); // デフォルト値
    });

    it('極端な設定値を正規化する', () => {
      process.env.GITHUB_TOKEN = 'extreme-token';
      process.env.GITHUB_TIMEOUT_MS = '999999999'; // 非現実的に大きな値
      process.env.GITHUB_RETRY_ATTEMPTS = '100'; // 非現実的に多いリトライ

      const config = createGitHubConfig('owner', 'repo');

      expect(config.timeout_ms).toBeLessThanOrEqual(300000); // 最大5分
      expect(config.retry_attempts).toBeLessThanOrEqual(10); // 最大10回
    });

    it('Unicode文字を含む設定を処理する', () => {
      process.env.GITHUB_TOKEN = 'unicode-token-🔐';
      
      const config = createGitHubConfig('test-owner', 'test-repo');

      expect(config.token).toContain('unicode-token');
      expect(config.owner).toBe('test-owner');
      expect(config.repo).toBe('test-repo');
    });

    it('設定エラーからの回復', () => {
      // 一時的に無効な設定
      process.env.GITHUB_TOKEN = '';

      expect(() => createGitHubConfig('owner', 'repo')).toThrow();

      // 設定を修正
      process.env.GITHUB_TOKEN = 'recovery-token';

      expect(() => createGitHubConfig('owner', 'repo')).not.toThrow();
    });
  });
});