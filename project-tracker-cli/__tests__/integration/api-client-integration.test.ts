/**
 * API Client Integration Tests
 * QA Engineer設計 - GitHub API クライアントとの統合テスト
 * 
 * @author QA Engineer
 * @security Testing real API integration with security measures
 */

import { GitHubApiClient } from '../../src/api/github.js';
import { GitHubConfig } from '../../src/types/index.js';
import { createMockApiResponse } from '../mocks/github-api.mock.js';

// 実際のHTTPリクエストをモック
jest.mock('axios');
const mockAxios = require('axios');

describe('GitHub API Client Integration Tests', () => {
  let apiClient: GitHubApiClient;
  let testConfig: GitHubConfig;

  beforeEach(() => {
    testConfig = {
      token: 'test-token-123',
      owner: 'test-owner',
      repo: 'test-repo',
      base_url: 'https://api.github.com',
      timeout_ms: 30000,
      retry_attempts: 3,
      rate_limit_buffer: 100
    };

    // axiosのモックリセット
    mockAxios.create.mockReturnValue(mockAxios);
    mockAxios.get.mockClear();
    mockAxios.post.mockClear();
    mockAxios.interceptors = {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    };

    apiClient = new GitHubApiClient(testConfig);
  });

  describe('API Client Configuration', () => {
    it('正しい設定でAPIクライアントが初期化される', () => {
      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.github.com',
        timeout: 30000,
        headers: {
          'Authorization': 'token test-token-123',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': expect.stringContaining('project-tracker-cli')
        }
      });
    });

    it('カスタムbaseURLが適用される', () => {
      const enterpriseConfig = {
        ...testConfig,
        base_url: 'https://github.enterprise.com/api/v3'
      };

      new GitHubApiClient(enterpriseConfig);

      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://github.enterprise.com/api/v3'
        })
      );
    });

    it('インターセプターが設定される', () => {
      expect(mockAxios.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxios.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('Connection Testing', () => {
    it('接続テストが成功する', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: { login: 'test-owner' }
      });

      const result = await apiClient.testConnection();

      expect(result).toBe(true);
      expect(mockAxios.get).toHaveBeenCalledWith('/user');
    });

    it('接続テストが失敗する', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await apiClient.testConnection();

      expect(result).toBe(false);
    });

    it('不正なトークンで接続が失敗する', async () => {
      mockAxios.get.mockRejectedValue({
        response: { status: 401, data: { message: 'Bad credentials' } }
      });

      const result = await apiClient.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('Repository API Integration', () => {
    const mockRepositoryData = {
      id: 123456789,
      name: 'test-repo',
      full_name: 'test-owner/test-repo',
      description: 'Test repository',
      private: false,
      html_url: 'https://github.com/test-owner/test-repo',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-07-29T12:00:00Z',
      pushed_at: '2024-07-29T11:30:00Z',
      language: 'TypeScript',
      size: 1024,
      stargazers_count: 42,
      watchers_count: 10,
      forks_count: 5,
      open_issues_count: 3,
      default_branch: 'main'
    };

    it('リポジトリ情報を正常に取得する', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockRepositoryData,
        headers: {
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1640995200'
        }
      });

      const response = await apiClient.getRepository();

      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockRepositoryData);
      expect(mockAxios.get).toHaveBeenCalledWith('/repos/test-owner/test-repo');
    });

    it('存在しないリポジトリで404エラーを処理する', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Not Found' }
        }
      });

      await expect(apiClient.getRepository()).rejects.toThrow();
    });

    it('プライベートリポジトリのアクセス権限エラーを処理する', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Forbidden' }
        }
      });

      await expect(apiClient.getRepository()).rejects.toThrow();
    });
  });

  describe('Commits API Integration', () => {
    const mockCommitsData = [
      {
        sha: 'abc123def456',
        commit: {
          author: {
            name: 'Test Developer',
            email: 'test@example.com',
            date: '2024-07-29T10:00:00Z'
          },
          committer: {
            name: 'Test Developer',
            email: 'test@example.com',
            date: '2024-07-29T10:00:00Z'
          },
          message: 'feat: add new feature'
        },
        author: {
          login: 'test-user',
          id: 12345,
          avatar_url: 'https://github.com/images/error/test-user_happy.gif'
        },
        stats: {
          total: 100,
          additions: 80,
          deletions: 20
        }
      }
    ];

    it('コミット情報を正常に取得する', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockCommitsData,
        headers: {
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4998',
          'x-ratelimit-reset': '1640995200'
        }
      });

      const response = await apiClient.getCommits();

      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockCommitsData);
      expect(mockAxios.get).toHaveBeenCalledWith('/repos/test-owner/test-repo/commits', {
        params: expect.any(Object)
      });
    });

    it('日付範囲を指定してコミットを取得する', async () => {
      const since = new Date('2024-07-01');
      const until = new Date('2024-07-31');

      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockCommitsData
      });

      await apiClient.getCommits({ since, until });

      expect(mockAxios.get).toHaveBeenCalledWith('/repos/test-owner/test-repo/commits', {
        params: {
          since: since.toISOString(),
          until: until.toISOString(),
          per_page: 100,
          page: 1
        }
      });
    });

    it('ページネーションパラメータが正しく設定される', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockCommitsData
      });

      await apiClient.getCommits({ page: 2, per_page: 50 });

      expect(mockAxios.get).toHaveBeenCalledWith('/repos/test-owner/test-repo/commits', {
        params: {
          per_page: 50,
          page: 2
        }
      });
    });
  });

  describe('Pull Requests API Integration', () => {
    const mockPullRequestsData = [
      {
        id: 987654321,
        number: 1,
        title: 'Add comprehensive test suite',
        body: 'This PR adds a complete test suite.',
        state: 'closed',
        merged: true,
        created_at: '2024-07-25T09:00:00Z',
        updated_at: '2024-07-26T14:30:00Z',
        closed_at: '2024-07-26T14:30:00Z',
        merged_at: '2024-07-26T14:30:00Z',
        user: {
          login: 'test-user',
          id: 12345
        },
        base: {
          ref: 'main',
          sha: 'base123abc'
        },
        head: {
          ref: 'feature/tests',
          sha: 'head456def'
        },
        additions: 500,
        deletions: 50,
        changed_files: 15
      }
    ];

    it('プルリクエスト情報を正常に取得する', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockPullRequestsData
      });

      const response = await apiClient.getPullRequests();

      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockPullRequestsData);
      expect(mockAxios.get).toHaveBeenCalledWith('/repos/test-owner/test-repo/pulls', {
        params: {
          state: 'all',
          per_page: 100,
          page: 1
        }
      });
    });

    it('異なる状態のプルリクエストを取得する', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockPullRequestsData
      });

      await apiClient.getPullRequests({ state: 'open' });

      expect(mockAxios.get).toHaveBeenCalledWith('/repos/test-owner/test-repo/pulls', {
        params: {
          state: 'open',
          per_page: 100,
          page: 1
        }
      });
    });
  });

  describe('Issues API Integration', () => {
    const mockIssuesData = [
      {
        id: 111222333,
        number: 1,
        title: 'Bug: API rate limit exceeded',
        body: 'The application hits GitHub API rate limits',
        state: 'closed',
        created_at: '2024-07-20T10:00:00Z',
        updated_at: '2024-07-22T16:45:00Z',
        closed_at: '2024-07-22T16:45:00Z',
        user: {
          login: 'bug-reporter',
          id: 11111
        },
        assignees: [],
        labels: [
          {
            name: 'bug',
            color: 'd73a49'
          }
        ]
      }
    ];

    it('イシュー情報を正常に取得する', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockIssuesData
      });

      const response = await apiClient.getIssues();

      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockIssuesData);
      expect(mockAxios.get).toHaveBeenCalledWith('/repos/test-owner/test-repo/issues', {
        params: {
          state: 'all',
          per_page: 100,
          page: 1
        }
      });
    });

    it('クローズされたイシューのみ取得する', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: mockIssuesData
      });

      await apiClient.getIssues({ state: 'closed' });

      expect(mockAxios.get).toHaveBeenCalledWith('/repos/test-owner/test-repo/issues', {
        params: {
          state: 'closed',
          per_page: 100,
          page: 1
        }
      });
    });
  });

  describe('Rate Limit Handling', () => {
    it('レート制限情報を正しく追跡する', async () => {
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: { login: 'test-owner' },
        headers: {
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1640995200'
        }
      });

      await apiClient.testConnection();
      const rateLimitInfo = apiClient.getRateLimitInfo();

      expect(rateLimitInfo).toBeDefined();
      expect(rateLimitInfo?.limit).toBe(5000);
      expect(rateLimitInfo?.remaining).toBe(4999);
      expect(rateLimitInfo?.reset).toBeInstanceOf(Date);
    });

    it('レート制限エラーを適切に処理する', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1640995200'
          },
          data: {
            message: 'API rate limit exceeded'
          }
        }
      });

      await expect(apiClient.getRepository()).rejects.toThrow('API rate limit exceeded');
    });

    it('レート制限リセット時刻が正しく解析される', async () => {
      const resetTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1時間後

      mockAxios.get.mockResolvedValue({
        status: 200,
        data: { login: 'test-owner' },
        headers: {
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': resetTimestamp.toString()
        }
      });

      await apiClient.testConnection();
      const rateLimitInfo = apiClient.getRateLimitInfo();

      expect(rateLimitInfo?.reset.getTime()).toBe(resetTimestamp * 1000);
    });
  });

  describe('Pagination Support', () => {
    it('getAllPagesが複数ページを正しく処理する', async () => {
      const page1Data = [{ id: 1 }, { id: 2 }];
      const page2Data = [{ id: 3 }, { id: 4 }];
      const page3Data: any[] = [];

      let callCount = 0;
      const mockFetchFunction = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: page1Data });
        } else if (callCount === 2) {
          return Promise.resolve({ data: page2Data });
        } else {
          return Promise.resolve({ data: page3Data });
        }
      });

      const result = await apiClient.getAllPages(mockFetchFunction);

      expect(result).toEqual([...page1Data, ...page2Data]);
      expect(mockFetchFunction).toHaveBeenCalledTimes(3);
      expect(mockFetchFunction).toHaveBeenNthCalledWith(1, 1);
      expect(mockFetchFunction).toHaveBeenNthCalledWith(2, 2);
      expect(mockFetchFunction).toHaveBeenNthCalledWith(3, 3);
    });

    it('getAllPagesが無限ループを防止する', async () => {
      const mockFetchFunction = jest.fn().mockResolvedValue({
        data: [{ id: 1 }] // 常にデータを返す
      });

      const result = await apiClient.getAllPages(mockFetchFunction);

      expect(mockFetchFunction).toHaveBeenCalledTimes(100); // 最大ページ数
      expect(result).toHaveLength(100); // 100ページ分のデータ
    });

    it('getAllPagesがエラーを適切に処理する', async () => {
      const mockFetchFunction = jest.fn()
        .mockResolvedValueOnce({ data: [{ id: 1 }] })
        .mockRejectedValueOnce(new Error('API Error'));

      await expect(apiClient.getAllPages(mockFetchFunction)).rejects.toThrow('API Error');
    });
  });

  describe('Error Handling and Retries', () => {
    it('一時的なネットワークエラーをリトライする', async () => {
      mockAxios.get
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Connection reset'))
        .mockResolvedValueOnce({
          status: 200,
          data: { login: 'test-owner' }
        });

      const result = await apiClient.testConnection();

      expect(result).toBe(true);
      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });

    it('最大リトライ回数に達したら失敗する', async () => {
      mockAxios.get.mockRejectedValue(new Error('Persistent error'));

      const result = await apiClient.testConnection();

      expect(result).toBe(false);
      expect(mockAxios.get).toHaveBeenCalledTimes(3); // 初回 + 2回リトライ
    });

    it('4xxエラーはリトライしない', async () => {
      mockAxios.get.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Bad credentials' }
        }
      });

      const result = await apiClient.testConnection();

      expect(result).toBe(false);
      expect(mockAxios.get).toHaveBeenCalledTimes(1); // リトライなし
    });

    it('サーバーエラー（5xx）をリトライする', async () => {
      mockAxios.get
        .mockRejectedValueOnce({
          response: {
            status: 500,
            data: { message: 'Internal Server Error' }
          }
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { login: 'test-owner' }
        });

      const result = await apiClient.testConnection();

      expect(result).toBe(true);
      expect(mockAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Security Headers and Authentication', () => {
    it('認証ヘッダーが正しく設定される', () => {
      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'token test-token-123'
          })
        })
      );
    });

    it('User-Agentヘッダーが設定される', () => {
      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringMatching(/project-tracker-cli/)
          })
        })
      );
    });

    it('GitHub APIバージョンヘッダーが設定される', () => {
      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github.v3+json'
          })
        })
      );
    });
  });

  describe('Timeout and Request Configuration', () => {
    it('タイムアウト設定が適用される', () => {
      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000
        })
      );
    });

    it('カスタムタイムアウトが適用される', () => {
      const customConfig = {
        ...testConfig,
        timeout_ms: 60000
      };

      new GitHubApiClient(customConfig);

      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000
        })
      );
    });
  });
});