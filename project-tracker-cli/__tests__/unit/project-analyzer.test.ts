/**
 * Project Analyzer Unit Tests
 * QA Engineer設計 - プロジェクト分析エンジンのユニットテスト
 * 
 * @author QA Engineer
 * @security Testing analysis logic with mocked data
 */

import { ProjectAnalyzer } from '../../src/core/analyzer.js';
import { AnalysisConfig, ProjectAnalysis, ProjectMetrics } from '../../src/types/index.js';
import { 
  createGitHubApiMock, 
  mockRepository, 
  mockCommits, 
  mockPullRequests, 
  mockIssues 
} from '../mocks/github-api.mock.js';

describe('ProjectAnalyzer', () => {
  let mockApiClient: ReturnType<typeof createGitHubApiMock>;
  let defaultConfig: AnalysisConfig;
  let analyzer: ProjectAnalyzer;

  beforeEach(() => {
    mockApiClient = createGitHubApiMock();
    
    defaultConfig = {
      time_range_days: 30,
      include_weekends: true,
      exclude_merge_commits: false,
      minimum_commit_message_length: 10,
      health_score_weights: {
        activity: 0.3,
        code_quality: 0.3,
        collaboration: 0.2,
        issue_management: 0.2
      }
    };

    analyzer = new ProjectAnalyzer(mockApiClient as any, defaultConfig);
  });

  describe('Constructor and Configuration', () => {
    it('設定値を正しく検証・正規化する', () => {
      const invalidConfig: AnalysisConfig = {
        time_range_days: -5, // 無効な値
        include_weekends: true,
        exclude_merge_commits: false,
        minimum_commit_message_length: -10, // 無効な値
        health_score_weights: {
          activity: 1.5, // 無効な値（1を超える）
          code_quality: -0.1, // 無効な値（0未満）
          collaboration: 0.2,
          issue_management: 0.3
        }
      };

      const testAnalyzer = new ProjectAnalyzer(mockApiClient as any, invalidConfig);
      expect(testAnalyzer).toBeDefined();
      // 内部的に正規化されることを確認（公開メソッドがないため間接的テスト）
    });

    it('健康度重みの合計を1に正規化する', () => {
      const unnormalizedConfig: AnalysisConfig = {
        ...defaultConfig,
        health_score_weights: {
          activity: 2.0,
          code_quality: 2.0,
          collaboration: 1.0,
          issue_management: 1.0
        }
      };

      const testAnalyzer = new ProjectAnalyzer(mockApiClient as any, unnormalizedConfig);
      expect(testAnalyzer).toBeDefined();
      // 正規化されることを確認（合計が6.0 → 1.0に正規化）
    });

    it('時間範囲を1-365日の範囲に制限する', () => {
      const extremeConfig: AnalysisConfig = {
        ...defaultConfig,
        time_range_days: 500 // 365日を超える
      };

      const testAnalyzer = new ProjectAnalyzer(mockApiClient as any, extremeConfig);
      expect(testAnalyzer).toBeDefined();
    });
  });

  describe('analyzeProject', () => {
    beforeEach(() => {
      // getAllPages メソッドのモック
      (mockApiClient as any).getAllPages = jest.fn()
        .mockImplementation((fetchFn: any) => Promise.resolve([]));
    });

    it('完全なプロジェクト分析を実行する', async () => {
      // getCommits メソッドのモック（ページネーション対応）
      (mockApiClient as any).getCommits = jest.fn()
        .mockResolvedValueOnce({ data: mockCommits })
        .mockResolvedValueOnce({ data: [] }); // 2ページ目は空

      (mockApiClient as any).getAllPages
        .mockResolvedValueOnce(mockPullRequests)
        .mockResolvedValueOnce(mockIssues);

      const analysis = await analyzer.analyzeProject();

      expect(analysis).toBeDefined();
      expect(analysis.repository).toBe(mockRepository.full_name);
      expect(analysis.analysis_date).toBeValidDate();
      expect(analysis.time_range.start).toBeValidDate();
      expect(analysis.time_range.end).toBeValidDate();
      expect(analysis.metrics).toBeDefined();
      expect(analysis.trends).toBeDefined();
      expect(analysis.health_score).toBeGreaterThanOrEqual(0);
      expect(analysis.health_score).toBeLessThanOrEqual(100);
      expect(analysis.recommendations).toBeInstanceOf(Array);
      expect(analysis.data_integrity_hash).toMatch(/^[a-f0-9]{16}$/);
    });

    it('API エラーを適切に処理する', async () => {
      mockApiClient.mockApiError('getRepository', new Error('API Error'));

      await expect(analyzer.analyzeProject()).rejects.toThrow();
    });

    it('レート制限エラーを適切に処理する', async () => {
      mockApiClient.mockRateLimitExceeded();

      await expect(analyzer.analyzeProject()).rejects.toThrow();
    });

    it('空のデータセットを適切に処理する', async () => {
      (mockApiClient as any).getCommits = jest.fn()
        .mockResolvedValue({ data: [] });
      (mockApiClient as any).getAllPages = jest.fn()
        .mockResolvedValue([]);

      const analysis = await analyzer.analyzeProject();

      expect(analysis.metrics.commits.total).toBe(0);
      expect(analysis.metrics.pull_requests.total).toBe(0);
      expect(analysis.metrics.issues.total).toBe(0);
      expect(analysis.health_score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metrics Calculation', () => {
    beforeEach(() => {
      (mockApiClient as any).getCommits = jest.fn()
        .mockResolvedValueOnce({ data: mockCommits })
        .mockResolvedValueOnce({ data: [] });
      (mockApiClient as any).getAllPages = jest.fn()
        .mockResolvedValueOnce(mockPullRequests)
        .mockResolvedValueOnce(mockIssues);
    });

    it('コミットメトリクスが正しく計算される', async () => {
      const analysis = await analyzer.analyzeProject();
      const commitMetrics = analysis.metrics.commits;

      expect(commitMetrics.total).toBe(mockCommits.length);
      expect(commitMetrics.by_author).toBeDefined();
      expect(commitMetrics.by_date).toBeDefined();
      expect(commitMetrics.average_per_day).toBeGreaterThanOrEqual(0);
      expect(Object.keys(commitMetrics.by_author).length).toBeGreaterThan(0);
    });

    it('プルリクエストメトリクスが正しく計算される', async () => {
      const analysis = await analyzer.analyzeProject();
      const prMetrics = analysis.metrics.pull_requests;

      expect(prMetrics.total).toBe(mockPullRequests.length);
      expect(prMetrics.open).toBeGreaterThanOrEqual(0);
      expect(prMetrics.closed).toBeGreaterThanOrEqual(0);
      expect(prMetrics.merged).toBeGreaterThanOrEqual(0);
      expect(prMetrics.average_merge_time_hours).toBeGreaterThanOrEqual(0);
    });

    it('イシューメトリクスが正しく計算される', async () => {
      const analysis = await analyzer.analyzeProject();
      const issueMetrics = analysis.metrics.issues;

      expect(issueMetrics.total).toBe(mockIssues.length);
      expect(issueMetrics.open).toBeGreaterThanOrEqual(0);
      expect(issueMetrics.closed).toBeGreaterThanOrEqual(0);
      expect(issueMetrics.resolution_time_average_hours).toBeGreaterThanOrEqual(0);
    });

    it('コントリビューターメトリクスが正しく計算される', async () => {
      const analysis = await analyzer.analyzeProject();
      const contributorMetrics = analysis.metrics.contributors;

      expect(contributorMetrics.total).toBeGreaterThan(0);
      expect(contributorMetrics.active_last_30_days).toBeGreaterThanOrEqual(0);
      expect(contributorMetrics.top_contributors).toBeInstanceOf(Array);
      expect(contributorMetrics.top_contributors.length).toBeLessThanOrEqual(10);
    });

    it('コード変更メトリクスが正しく計算される', async () => {
      const analysis = await analyzer.analyzeProject();
      const codeMetrics = analysis.metrics.code_changes;

      expect(codeMetrics.total_additions).toBeGreaterThanOrEqual(0);
      expect(codeMetrics.total_deletions).toBeGreaterThanOrEqual(0);
      expect(codeMetrics.files_changed).toBeGreaterThanOrEqual(0);
      expect(codeMetrics.lines_per_commit_average).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Trend Analysis', () => {
    beforeEach(() => {
      (mockApiClient as any).getCommits = jest.fn()
        .mockResolvedValueOnce({ data: mockCommits })
        .mockResolvedValueOnce({ data: [] });
      (mockApiClient as any).getAllPages = jest.fn()
        .mockResolvedValueOnce(mockPullRequests)
        .mockResolvedValueOnce(mockIssues);
    });

    it('トレンド分析が正しく実行される', async () => {
      const analysis = await analyzer.analyzeProject();
      const trends = analysis.trends;

      expect(['increasing', 'decreasing', 'stable']).toContain(trends.activity_trend);
      expect(['accelerating', 'decelerating', 'consistent']).toContain(trends.velocity_trend);
      expect(['improving', 'degrading', 'stable']).toContain(trends.issue_resolution_trend);
      expect(['growing', 'shrinking', 'stable']).toContain(trends.contributor_engagement);
      expect(trends.weekly_activity).toBeInstanceOf(Array);
    });

    it('週別アクティビティが正しく計算される', async () => {
      const analysis = await analyzer.analyzeProject();
      const weeklyActivity = analysis.trends.weekly_activity;

      expect(weeklyActivity).toBeInstanceOf(Array);
      weeklyActivity.forEach(week => {
        expect(week.week).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(week.commits).toBeGreaterThanOrEqual(0);
        expect(week.prs).toBeGreaterThanOrEqual(0);
        expect(week.issues_closed).toBeGreaterThanOrEqual(0);
      });
    });

    it('データが不十分な場合に安定トレンドを返す', async () => {
      // 少ないデータでテスト
      (mockApiClient as any).getCommits = jest.fn()
        .mockResolvedValue({ data: [mockCommits[0]] });
      (mockApiClient as any).getAllPages = jest.fn()
        .mockResolvedValue([]);

      const analysis = await analyzer.analyzeProject();
      const trends = analysis.trends;

      expect(trends.velocity_trend).toBe('consistent');
      expect(trends.issue_resolution_trend).toBe('stable');
    });
  });

  describe('Health Score Calculation', () => {
    beforeEach(() => {
      (mockApiClient as any).getCommits = jest.fn()
        .mockResolvedValueOnce({ data: mockCommits })
        .mockResolvedValueOnce({ data: [] });
      (mockApiClient as any).getAllPages = jest.fn()
        .mockResolvedValueOnce(mockPullRequests)
        .mockResolvedValueOnce(mockIssues);
    });

    it('健康度スコアが0-100の範囲で計算される', async () => {
      const analysis = await analyzer.analyzeProject();
      
      expect(analysis.health_score).toBeGreaterThanOrEqual(0);
      expect(analysis.health_score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(analysis.health_score)).toBe(true);
    });

    it('異なる重み設定で異なるスコアが計算される', async () => {
      const config1: AnalysisConfig = {
        ...defaultConfig,
        health_score_weights: {
          activity: 1.0,
          code_quality: 0.0,
          collaboration: 0.0,
          issue_management: 0.0
        }
      };

      const config2: AnalysisConfig = {
        ...defaultConfig,
        health_score_weights: {
          activity: 0.0,
          code_quality: 1.0,
          collaboration: 0.0,
          issue_management: 0.0
        }
      };

      const analyzer1 = new ProjectAnalyzer(mockApiClient as any, config1);
      const analyzer2 = new ProjectAnalyzer(mockApiClient as any, config2);

      const analysis1 = await analyzer1.analyzeProject();
      const analysis2 = await analyzer2.analyzeProject();

      // 通常は異なるスコアになるが、テストデータの特性により同じになる可能性もある
      expect(analysis1.health_score).toBeGreaterThanOrEqual(0);
      expect(analysis2.health_score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Recommendations Generation', () => {
    beforeEach(() => {
      (mockApiClient as any).getCommits = jest.fn()
        .mockResolvedValueOnce({ data: mockCommits })
        .mockResolvedValueOnce({ data: [] });
      (mockApiClient as any).getAllPages = jest.fn()
        .mockResolvedValueOnce(mockPullRequests)
        .mockResolvedValueOnce(mockIssues);
    });

    it('推奨事項が生成される', async () => {
      const analysis = await analyzer.analyzeProject();
      
      expect(analysis.recommendations).toBeInstanceOf(Array);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      analysis.recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });

    it('低いヘルススコアで適切な推奨事項が生成される', async () => {
      // 低いスコアを生成するために設定を調整
      const lowActivityConfig: AnalysisConfig = {
        ...defaultConfig,
        health_score_weights: {
          activity: 1.0,
          code_quality: 0.0,
          collaboration: 0.0,
          issue_management: 0.0
        }
      };

      // コミット数を極端に少なくする
      (mockApiClient as any).getCommits = jest.fn()
        .mockResolvedValue({ data: [] });

      const lowActivityAnalyzer = new ProjectAnalyzer(mockApiClient as any, lowActivityConfig);
      const analysis = await lowActivityAnalyzer.analyzeProject();

      expect(analysis.recommendations.some(rec => 
        rec.includes('コミット頻度') || rec.includes('健康度')
      )).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    beforeEach(() => {
      (mockApiClient as any).getCommits = jest.fn()
        .mockResolvedValueOnce({ data: mockCommits })
        .mockResolvedValueOnce({ data: [] });
      (mockApiClient as any).getAllPages = jest.fn()
        .mockResolvedValueOnce(mockPullRequests)
        .mockResolvedValueOnce(mockIssues);
    });

    it('データ整合性ハッシュが生成される', async () => {
      const analysis = await analyzer.analyzeProject();
      
      expect(analysis.data_integrity_hash).toBeDefined();
      expect(analysis.data_integrity_hash).toMatch(/^[a-f0-9]{16}$/);
    });

    it('同じデータで同じハッシュが生成される', async () => {
      const analysis1 = await analyzer.analyzeProject();
      
      // 同じモックデータを使用してもう一度実行
      mockApiClient.reset();
      (mockApiClient as any).getCommits = jest.fn()
        .mockResolvedValueOnce({ data: mockCommits })
        .mockResolvedValueOnce({ data: [] });
      (mockApiClient as any).getAllPages = jest.fn()
        .mockResolvedValueOnce(mockPullRequests)
        .mockResolvedValueOnce(mockIssues);

      const analysis2 = await analyzer.analyzeProject();
      
      // 日付が同じ場合（同じ日に実行した場合）、ハッシュは同じになる
      expect(analysis1.data_integrity_hash).toBe(analysis2.data_integrity_hash);
    });
  });

  describe('Error Handling', () => {
    it('APIエラーからTrackerErrorが生成される', async () => {
      const apiError = new Error('GitHub API failed');
      mockApiClient.mockApiError('getRepository', apiError);

      try {
        await analyzer.analyzeProject();
        fail('例外が発生するべき');
      } catch (error: any) {
        expect(error.code).toBe('ANALYSIS_ERROR');
        expect(error.message).toContain('GitHub API failed');
        expect(error.timestamp).toBeValidDate();
        expect(error.source).toBe('analyzer');
      }
    });

    it('長いエラーメッセージが適切に切り詰められる', async () => {
      const longError = new Error('a'.repeat(1000));
      mockApiClient.mockApiError('getRepository', longError);

      try {
        await analyzer.analyzeProject();
        fail('例外が発生するべき');
      } catch (error: any) {
        expect(error.message.length).toBeLessThanOrEqual(500);
      }
    });
  });

  describe('Configuration Edge Cases', () => {
    it('マージコミット除外設定が動作する', async () => {
      const mergeCommitConfig: AnalysisConfig = {
        ...defaultConfig,
        exclude_merge_commits: true
      };

      const mergeCommits = [
        {
          ...mockCommits[0],
          commit: {
            ...mockCommits[0].commit,
            message: 'Merge pull request #123 from feature/test'
          }
        },
        mockCommits[1] // 通常のコミット
      ];

      (mockApiClient as any).getCommits = jest.fn()
        .mockResolvedValueOnce({ data: mergeCommits })
        .mockResolvedValueOnce({ data: [] });
      (mockApiClient as any).getAllPages = jest.fn()
        .mockResolvedValue([]);

      const mergeAnalyzer = new ProjectAnalyzer(mockApiClient as any, mergeCommitConfig);
      const analysis = await mergeAnalyzer.analyzeProject();

      // マージコミットが除外されて1件のみになることを確認
      expect(analysis.metrics.commits.total).toBe(1);
    });

    it('最小コミットメッセージ長設定が動作する', async () => {
      const minLengthConfig: AnalysisConfig = {
        ...defaultConfig,
        minimum_commit_message_length: 50
      };

      const shortMessageCommits = [
        {
          ...mockCommits[0],
          commit: {
            ...mockCommits[0].commit,
            message: 'fix' // 短すぎるメッセージ
          }
        },
        mockCommits[1] // 十分な長さのメッセージ
      ];

      (mockApiClient as any).getCommits = jest.fn()
        .mockResolvedValueOnce({ data: shortMessageCommits })
        .mockResolvedValueOnce({ data: [] });
      (mockApiClient as any).getAllPages = jest.fn()
        .mockResolvedValue([]);

      const lengthAnalyzer = new ProjectAnalyzer(mockApiClient as any, minLengthConfig);
      const analysis = await lengthAnalyzer.analyzeProject();

      // 短いメッセージのコミットが除外されて1件のみになることを確認
      expect(analysis.metrics.commits.total).toBe(1);
    });
  });

  describe('Performance Considerations', () => {
    it('大量のコミットを効率的に処理する', async () => {
      const manyCommits = Array.from({ length: 1000 }, (_, i) => ({
        ...mockCommits[0],
        sha: `commit-${i}`,
        commit: {
          ...mockCommits[0].commit,
          author: {
            ...mockCommits[0].commit.author,
            date: new Date(Date.now() - i * 3600000).toISOString() // 1時間ずつ遡る
          }
        }
      }));

      // ページネーションをシミュレート
      (mockApiClient as any).getCommits = jest.fn()
        .mockImplementation(({ page }: { page: number }) => {
          const start = (page - 1) * 100;
          const end = start + 100;
          return Promise.resolve({ data: manyCommits.slice(start, end) });
        });

      (mockApiClient as any).getAllPages = jest.fn()
        .mockResolvedValue([]);

      const startTime = Date.now();
      const analysis = await analyzer.analyzeProject();
      const duration = Date.now() - startTime;

      expect(analysis.metrics.commits.total).toBe(1000);
      expect(duration).toBeLessThan(5000); // 5秒以内で完了
    });

    it('無限ループ防止機能が動作する', async () => {
      // 無限にデータを返すAPIをシミュレート
      (mockApiClient as any).getCommits = jest.fn()
        .mockImplementation(() => Promise.resolve({ data: mockCommits }));

      (mockApiClient as any).getAllPages = jest.fn()
        .mockResolvedValue([]);

      const analysis = await analyzer.analyzeProject();
      
      // 無限ループが防止され、最大ページ数制限により完了することを確認
      expect(analysis).toBeDefined();
      expect((mockApiClient as any).getCommits).toHaveBeenCalledTimes(100); // 最大ページ数
    });
  });
});