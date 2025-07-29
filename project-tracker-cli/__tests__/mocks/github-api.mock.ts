/**
 * GitHub API Mock Implementation
 * QA Engineer設計 - APIモック・スタブ
 * 
 * @author QA Engineer
 * @security Secure mock data without real credentials
 */

import { GitHubRepository, GitHubCommit, GitHubPullRequest, GitHubIssue, RateLimitInfo } from '../../src/types/index.js';

// モックデータ定義
export const mockRepository: GitHubRepository = {
  id: 123456789,
  name: 'test-repo',
  full_name: 'test-owner/test-repo',
  description: 'Test repository for QA testing',
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

export const mockCommits: GitHubCommit[] = [
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
      message: 'feat: add new feature\n\nImplemented new functionality for testing purposes'
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
  },
  {
    sha: 'def456ghi789',
    commit: {
      author: {
        name: 'Another Developer',
        email: 'another@example.com',
        date: '2024-07-28T15:30:00Z'
      },
      committer: {
        name: 'Another Developer',
        email: 'another@example.com',
        date: '2024-07-28T15:30:00Z'
      },
      message: 'fix: resolve critical bug\n\nFixed security vulnerability in user input validation'
    },
    author: {
      login: 'another-user',
      id: 67890,
      avatar_url: 'https://github.com/images/error/another-user_happy.gif'
    },
    stats: {
      total: 25,
      additions: 15,
      deletions: 10
    }
  }
];

export const mockPullRequests: GitHubPullRequest[] = [
  {
    id: 987654321,
    number: 1,
    title: 'Add comprehensive test suite',
    body: 'This PR adds a complete test suite with unit, integration, and E2E tests.',
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
  },
  {
    id: 987654322,
    number: 2,
    title: 'Update documentation',
    body: 'Updated README and API documentation',
    state: 'open',
    merged: false,
    created_at: '2024-07-28T11:00:00Z',
    updated_at: '2024-07-29T09:15:00Z',
    closed_at: null,
    merged_at: null,
    user: {
      login: 'another-user',
      id: 67890
    },
    base: {
      ref: 'main',
      sha: 'base789xyz'
    },
    head: {
      ref: 'docs/update',
      sha: 'head012uvw'
    },
    additions: 100,
    deletions: 20,
    changed_files: 3
  }
];

export const mockIssues: GitHubIssue[] = [
  {
    id: 111222333,
    number: 1,
    title: 'Bug: API rate limit exceeded',
    body: 'The application hits GitHub API rate limits during heavy usage',
    state: 'closed',
    created_at: '2024-07-20T10:00:00Z',
    updated_at: '2024-07-22T16:45:00Z',
    closed_at: '2024-07-22T16:45:00Z',
    user: {
      login: 'bug-reporter',
      id: 11111
    },
    assignees: [
      {
        login: 'test-user',
        id: 12345
      }
    ],
    labels: [
      {
        name: 'bug',
        color: 'd73a49'
      },
      {
        name: 'priority-high',
        color: 'f9c513'
      }
    ]
  },
  {
    id: 444555666,
    number: 2,
    title: 'Feature request: Add CSV export',
    body: 'Users would like to export analysis results in CSV format',
    state: 'open',
    created_at: '2024-07-27T14:20:00Z',
    updated_at: '2024-07-29T08:30:00Z',
    closed_at: null,
    user: {
      login: 'feature-requester',
      id: 22222
    },
    assignees: [],
    labels: [
      {
        name: 'enhancement',
        color: 'a2eeef'
      },
      {
        name: 'good first issue',
        color: '7057ff'
      }
    ]
  }
];

export const mockRateLimitInfo: RateLimitInfo = {
  limit: 5000,
  remaining: 4950,
  reset: new Date(Date.now() + 3600000), // 1時間後
  used: 50
};

// API レスポンスモック関数
export const createMockApiResponse = <T>(data: T, status: number = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {
    'x-ratelimit-limit': '5000',
    'x-ratelimit-remaining': '4950',
    'x-ratelimit-reset': Math.floor((Date.now() + 3600000) / 1000).toString()
  },
  config: {}
});

// GitHub API クライアントモック
export const createGitHubApiMock = () => {
  return {
    testConnection: jest.fn().mockResolvedValue(true),
    getRepository: jest.fn().mockResolvedValue(createMockApiResponse(mockRepository)),
    getCommits: jest.fn().mockResolvedValue(createMockApiResponse(mockCommits)),
    getPullRequests: jest.fn().mockResolvedValue(createMockApiResponse(mockPullRequests)),
    getIssues: jest.fn().mockResolvedValue(createMockApiResponse(mockIssues)),
    getRateLimitInfo: jest.fn().mockReturnValue(mockRateLimitInfo),
    
    // エラーケース用のモック
    mockConnectionError: function() {
      this.testConnection.mockResolvedValue(false);
    },
    
    mockApiError: function(method: string, error: Error) {
      if (this[method as keyof typeof this] && typeof this[method as keyof typeof this] === 'function') {
        (this[method as keyof typeof this] as jest.Mock).mockRejectedValue(error);
      }
    },
    
    mockRateLimitExceeded: function() {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = {
        status: 403,
        headers: {
          'x-ratelimit-remaining': '0'
        }
      };
      this.getCommits.mockRejectedValue(rateLimitError);
      this.getPullRequests.mockRejectedValue(rateLimitError);
      this.getIssues.mockRejectedValue(rateLimitError);
    },
    
    reset: function() {
      Object.keys(this).forEach(key => {
        if (typeof this[key as keyof typeof this] === 'function' && key !== 'reset') {
          (this[key as keyof typeof this] as jest.Mock).mockReset();
        }
      });
      
      // デフォルトモックを再設定
      this.testConnection.mockResolvedValue(true);
      this.getRepository.mockResolvedValue(createMockApiResponse(mockRepository));
      this.getCommits.mockResolvedValue(createMockApiResponse(mockCommits));
      this.getPullRequests.mockResolvedValue(createMockApiResponse(mockPullRequests));
      this.getIssues.mockResolvedValue(createMockApiResponse(mockIssues));
      this.getRateLimitInfo.mockReturnValue(mockRateLimitInfo);
    }
  };
};

// テストユーティリティ
export const createTestRepository = (overrides: Partial<GitHubRepository> = {}): GitHubRepository => ({
  ...mockRepository,
  ...overrides
});

export const createTestCommit = (overrides: Partial<GitHubCommit> = {}): GitHubCommit => ({
  ...mockCommits[0],
  ...overrides
});

export const createTestPullRequest = (overrides: Partial<GitHubPullRequest> = {}): GitHubPullRequest => ({
  ...mockPullRequests[0],
  ...overrides
});

export const createTestIssue = (overrides: Partial<GitHubIssue> = {}): GitHubIssue => ({
  ...mockIssues[0],
  ...overrides
});

export default {
  mockRepository,
  mockCommits,
  mockPullRequests,
  mockIssues,
  mockRateLimitInfo,
  createMockApiResponse,
  createGitHubApiMock,
  createTestRepository,
  createTestCommit,
  createTestPullRequest,
  createTestIssue
};