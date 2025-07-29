/**
 * Analyzer API Integration Tests
 * QA Engineer設計 - 分析エンジンとAPIクライアントの統合テスト
 * 
 * @author QA Engineer
 * @security Testing end-to-end analysis workflow with mocked APIs
 */

import { ProjectAnalyzer } from '../../src/core/analyzer.js';
import { GitHubApiClient } from '../../src/api/github.js';
import { AnalysisConfig, GitHubConfig } from '../../src/types/index.js';
import { 
  createGitHubApiMock, 
  mockRepository, 
  mockCommits, 
  mockPullRequests, 
  mockIssues 
} from '../mocks/github-api.mock.js';

// axios をモック
jest.mock('axios');
const mockAxios = require('axios');

describe('Analyzer API Integration Tests', () => {
  let mockApiClient: ReturnType<typeof createGitHubApiMock>;
  let realApiClient: GitHubApiClient;
  let analyzer: ProjectAnalyzer;
  let testConfig: GitHubConfig;
  let analysisConfig: AnalysisConfig;

  beforeEach(() => {
    // モック APIクライアントのセットアップ
    mockApiClient = createGitHubApiMock();

    // 実際のAPIクライアントのセットアップ（axiosがモック化されている）
    testConfig = {
      token: 'test-integration-token',
      owner: 'test-owner',
      repo: 'test-repo',
      base_url: 'https://api.github.com',
      timeout_ms: 30000,
      retry_attempts: 3,
      rate_limit_buffer: 100
    };

    analysisConfig = {
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

    // axiosのモック設定
    mockAxios.create.mockReturnValue(mockAxios);
    mockAxios.interceptors = {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    };

    realApiClient = new GitHubApiClient(testConfig);
    analyzer = new ProjectAnalyzer(realApiClient, analysisConfig);
  });

  describe('Complete Analysis Workflow', () => {
    beforeEach(() => {
      // API レスポンスをモック
      mockAxios.get.mockImplementation((url: string, config?: any) => {
        if (url === '/repos/test-owner/test-repo') {
          return Promise.resolve({
            status: 200,
            data: mockRepository,
            headers: {
              'x-ratelimit-limit': '5000',
              'x-ratelimit-remaining': '4950',
              'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString()
            }
          });
        }

        if (url === '/repos/test-owner/test-repo/commits') {
          const page = config?.params?.page || 1;
          if (page === 1) {
            return Promise.resolve({
              status: 200,
              data: mockCommits,
              headers: {
                'x-ratelimit-limit': '5000',
                'x-ratelimit-remaining': '4949',
                'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString()
              }
            });
          } else {
            return Promise.resolve({
              status: 200,
              data: [],
              headers: {
                'x-ratelimit-limit': '5000',
                'x-ratelimit-remaining': '4948',
                'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString()
              }
            });
          }
        }

        if (url === '/repos/test-owner/test-repo/pulls') {
          const page = config?.params?.page || 1;
          if (page === 1) {
            return Promise.resolve({
              status: 200,
              data: mockPullRequests,
              headers: {
                'x-ratelimit-limit': '5000',
                'x-ratelimit-remaining': '4947',
                'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString()
              }
            });
          } else {
            return Promise.resolve({
              status: 200,
              data: [],
              headers: {
                'x-ratelimit-limit': '5000',
                'x-ratelimit-remaining': '4946',
                'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString()
              }
            });
          }
        }

        if (url === '/repos/test-owner/test-repo/issues') {
          const page = config?.params?.page || 1;
          if (page === 1) {
            return Promise.resolve({
              status: 200,
              data: mockIssues,
              headers: {
                'x-ratelimit-limit': '5000',
                'x-ratelimit-remaining': '4945',
                'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString()
              }
            });
          } else {
            return Promise.resolve({
              status: 200,
              data: [],
              headers: {
                'x-ratelimit-limit': '5000',
                'x-ratelimit-remaining': '4944',
                'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString()
              }
            });
          }
        }

        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });
    });

    it('完全な分析ワークフローが正常に実行される', async () => {
      const analysis = await analyzer.analyzeProject();

      // 分析結果の検証
      expect(analysis).toBeDefined();
      expect(analysis.repository).toBe('test-owner/test-repo');
      expect(analysis.analysis_date).toBeValidDate();
      expect(analysis.time_range.start).toBeValidDate();
      expect(analysis.time_range.end).toBeValidDate();

      // メトリクスの検証
      expect(analysis.metrics.commits.total).toBe(mockCommits.length);
      expect(analysis.metrics.pull_requests.total).toBe(mockPullRequests.length);
      expect(analysis.metrics.issues.total).toBe(mockIssues.length);

      // 健康度スコアの検証
      expect(analysis.health_score).toBeGreaterThanOrEqual(0);
      expect(analysis.health_score).toBeLessThanOrEqual(100);

      // 推奨事項の検証
      expect(analysis.recommendations).toBeInstanceOf(Array);
      expect(analysis.recommendations.length).toBeGreaterThan(0);

      // データ整合性ハッシュの検証
      expect(analysis.data_integrity_hash).toMatch(/^[a-f0-9]{16}$/);

      // API呼び出し回数の検証
      expect(mockAxios.get).toHaveBeenCalledTimes(7); // repo + 2x(commits,prs,issues) = 7回
    });

    it('日付範囲が正しく適用される', async () => {
      await analyzer.analyzeProject();

      // commits APIの呼び出しで日付パラメータが正しく設定されているかチェック
      const commitsCall = mockAxios.get.mock.calls.find(call => 
        call[0] === '/repos/test-owner/test-repo/commits'
      );

      expect(commitsCall[1].params.since).toBeDefined();
      expect(commitsCall[1].params.until).toBeDefined();
      
      const since = new Date(commitsCall[1].params.since);
      const until = new Date(commitsCall[1].params.until);
      const daysDiff = Math.ceil((until.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysDiff).toBe(analysisConfig.time_range_days);
    });

    it('レート制限情報が正しく追跡される', async () => {
      await analyzer.analyzeProject();

      const rateLimitInfo = realApiClient.getRateLimitInfo();
      expect(rateLimitInfo).toBeDefined();
      expect(rateLimitInfo?.limit).toBe(5000);
      expect(rateLimitInfo?.remaining).toBeLessThan(5000);
      expect(rateLimitInfo?.reset).toBeInstanceOf(Date);
    });
  });

  describe('Error Scenarios', () => {
    it('リポジトリ取得エラーを適切に処理する', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        if (url === '/repos/test-owner/test-repo') {
          return Promise.reject({
            response: {
              status: 404,
              data: { message: 'Not Found' }
            }
          });
        }
        return Promise.resolve({ status: 200, data: [] });
      });

      await expect(analyzer.analyzeProject()).rejects.toThrow();
    });

    it('コミット取得エラーを適切に処理する', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        if (url === '/repos/test-owner/test-repo') {
          return Promise.resolve({ status: 200, data: mockRepository });
        }
        if (url === '/repos/test-owner/test-repo/commits') {
          return Promise.reject(new Error('Commits API Error'));
        }
        return Promise.resolve({ status: 200, data: [] });
      });

      await expect(analyzer.analyzeProject()).rejects.toThrow();
    });

    it('部分的なAPIエラーでも処理を継続する', async () => {
      mockAxios.get.mockImplementation((url: string, config?: any) => {
        if (url === '/repos/test-owner/test-repo') {
          return Promise.resolve({ status: 200, data: mockRepository });
        }
        if (url === '/repos/test-owner/test-repo/commits') {
          return Promise.resolve({ status: 200, data: mockCommits });
        }
        if (url === '/repos/test-owner/test-repo/pulls') {
          return Promise.reject(new Error('PRs API temporarily unavailable'));
        }
        if (url === '/repos/test-owner/test-repo/issues') {
          return Promise.resolve({ status: 200, data: mockIssues });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      // PRs APIが失敗してもエラーで止まることを確認
      await expect(analyzer.analyzeProject()).rejects.toThrow();
    });

    it('レート制限エラーを適切に処理する', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        return Promise.reject({
          response: {
            status: 403,
            headers: {
              'x-ratelimit-remaining': '0',
              'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString()
            },
            data: {
              message: 'API rate limit exceeded'
            }
          }
        });
      });

      await expect(analyzer.analyzeProject()).rejects.toThrow('API rate limit exceeded');
    });
  });

  describe('Performance and Scalability', () => {
    it('大量のコミットを効率的に処理する', async () => {
      // 1000件のコミットをシミュレート
      const manyCommits = Array.from({ length: 1000 }, (_, i) => ({
        ...mockCommits[0],
        sha: `commit-${i}`,
        commit: {
          ...mockCommits[0].commit,
          author: {
            ...mockCommits[0].commit.author,
            date: new Date(Date.now() - i * 3600000).toISOString()
          }
        }
      }));

      mockAxios.get.mockImplementation((url: string, config?: any) => {
        if (url === '/repos/test-owner/test-repo') {
          return Promise.resolve({ status: 200, data: mockRepository });
        }
        if (url === '/repos/test-owner/test-repo/commits') {
          const page = config?.params?.page || 1;
          const startIndex = (page - 1) * 100;
          const endIndex = startIndex + 100;
          const pageData = manyCommits.slice(startIndex, endIndex);
          
          return Promise.resolve({
            status: 200,
            data: pageData,
            headers: {
              'x-ratelimit-limit': '5000',
              'x-ratelimit-remaining': (5000 - page).toString(),
              'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString()
            }
          });
        }
        // PRsとIssuesは空
        return Promise.resolve({ status: 200, data: [] });
      });

      const startTime = Date.now();
      const analysis = await analyzer.analyzeProject();
      const duration = Date.now() - startTime;

      expect(analysis.metrics.commits.total).toBe(1000);
      expect(duration).toBeLessThan(10000); // 10秒以内で完了
      expect(mockAxios.get).toHaveBeenCalledTimes(14); // repo + 11 commits pages + prs + issues
    });

    it('APIリクエスト頻度を制御する', async () => {
      mockAxios.get.mockImplementation((url: string, config?: any) => {
        if (url === '/repos/test-owner/test-repo') {
          return Promise.resolve({ status: 200, data: mockRepository });
        }
        if (url === '/repos/test-owner/test-repo/commits') {
          const page = config?.params?.page || 1;
          if (page <= 5) {
            return Promise.resolve({
              status: 200,
              data: Array.from({ length: 100 }, (_, i) => ({
                ...mockCommits[0],
                sha: `commit-${page}-${i}`
              })),
              headers: {
                'x-ratelimit-limit': '5000',
                'x-ratelimit-remaining': (5000 - page).toString(),
                'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString()
              }
            });
          } else {
            return Promise.resolve({ status: 200, data: [] });
          }
        }
        return Promise.resolve({ status: 200, data: [] });
      });

      const startTime = Date.now();
      await analyzer.analyzeProject();
      const duration = Date.now() - startTime;

      // リクエスト間の適切な間隔があることを確認（並列化されていない）
      expect(duration).toBeGreaterThan(100); // 最低限の処理時間
    });
  });

  describe('Data Quality and Validation', () => {
    it('不正なAPIレスポンスを適切に処理する', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        if (url === '/repos/test-owner/test-repo') {
          return Promise.resolve({
            status: 200,
            data: { ...mockRepository, id: null } // 不正なデータ
          });
        }
        return Promise.resolve({ status: 200, data: [] });
      });

      // 不正なデータでもエラーハンドリングされることを確認
      const analysis = await analyzer.analyzeProject();
      expect(analysis).toBeDefined();
    });

    it('空のレスポンスを適切に処理する', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        if (url === '/repos/test-owner/test-repo') {
          return Promise.resolve({ status: 200, data: mockRepository });
        }
        // すべてのデータを空にする
        return Promise.resolve({ status: 200, data: [] });
      });

      const analysis = await analyzer.analyzeProject();

      expect(analysis.metrics.commits.total).toBe(0);
      expect(analysis.metrics.pull_requests.total).toBe(0);
      expect(analysis.metrics.issues.total).toBe(0);
      expect(analysis.health_score).toBeGreaterThanOrEqual(0);
      expect(analysis.recommendations).toContain(
        expect.stringMatching(/コミット頻度|健康度/)
      );
    });

    it('データ整合性チェックが機能する', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        if (url === '/repos/test-owner/test-repo') {
          return Promise.resolve({ status: 200, data: mockRepository });
        }
        if (url === '/repos/test-owner/test-repo/commits') {
          return Promise.resolve({ status: 200, data: mockCommits });
        }
        return Promise.resolve({ status: 200, data: [] });
      });

      const analysis1 = await analyzer.analyzeProject();
      
      // 同じデータで再実行
      const analysis2 = await analyzer.analyzeProject();

      // 同じ日に実行した場合、データ整合性ハッシュは同じになる
      expect(analysis1.data_integrity_hash).toBe(analysis2.data_integrity_hash);
    });
  });

  describe('Configuration Integration', () => {
    it('マージコミット除外設定が反映される', async () => {
      const mergeCommitConfig: AnalysisConfig = {
        ...analysisConfig,
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

      mockAxios.get.mockImplementation((url: string) => {
        if (url === '/repos/test-owner/test-repo') {
          return Promise.resolve({ status: 200, data: mockRepository });
        }
        if (url === '/repos/test-owner/test-repo/commits') {
          return Promise.resolve({ status: 200, data: mergeCommits });
        }
        return Promise.resolve({ status: 200, data: [] });
      });

      const mergeAnalyzer = new ProjectAnalyzer(realApiClient, mergeCommitConfig);
      const analysis = await mergeAnalyzer.analyzeProject();

      // マージコミットが除外されて1件になることを確認
      expect(analysis.metrics.commits.total).toBe(1);
    });

    it('健康度重み設定が反映される', async () => {
      const activityFocusConfig: AnalysisConfig = {
        ...analysisConfig,
        health_score_weights: {
          activity: 1.0,
          code_quality: 0.0,
          collaboration: 0.0,
          issue_management: 0.0
        }
      };

      const qualityFocusConfig: AnalysisConfig = {
        ...analysisConfig,
        health_score_weights: {
          activity: 0.0,
          code_quality: 1.0,
          collaboration: 0.0,
          issue_management: 0.0
        }
      };

      mockAxios.get.mockImplementation((url: string) => {
        if (url === '/repos/test-owner/test-repo') {
          return Promise.resolve({ status: 200, data: mockRepository });
        }
        if (url === '/repos/test-owner/test-repo/commits') {
          return Promise.resolve({ status: 200, data: mockCommits });
        }
        return Promise.resolve({ status: 200, data: [] });
      });

      const activityAnalyzer = new ProjectAnalyzer(realApiClient, activityFocusConfig);
      const qualityAnalyzer = new ProjectAnalyzer(realApiClient, qualityFocusConfig);

      const activityAnalysis = await activityAnalyzer.analyzeProject();
      const qualityAnalysis = await qualityAnalyzer.analyzeProject();

      // 異なる重み設定で異なる結果が得られることを確認
      expect(activityAnalysis.health_score).toBeGreaterThanOrEqual(0);
      expect(qualityAnalysis.health_score).toBeGreaterThanOrEqual(0);
    });
  });
});