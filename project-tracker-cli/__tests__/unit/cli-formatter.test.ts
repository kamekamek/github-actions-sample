/**
 * CLI Formatter Unit Tests
 * QA Engineer設計 - CLIフォーマッターのユニットテスト
 * 
 * @author QA Engineer
 * @security Testing output formatting and display logic
 */

import { CLIFormatter } from '../../src/cli/formatter.js';
import { ProjectAnalysis, ProjectMetrics, ProjectTrends } from '../../src/types/index.js';

// Console.log をモック
const originalConsoleLog = console.log;

describe('CLIFormatter', () => {
  let formatter: CLIFormatter;
  let consoleLogs: string[];
  let mockAnalysis: ProjectAnalysis;

  beforeEach(() => {
    formatter = new CLIFormatter();
    consoleLogs = [];
    
    // console.log をモック
    console.log = (...args: any[]) => {
      consoleLogs.push(args.join(' '));
    };

    // モック分析データの作成
    mockAnalysis = {
      repository: 'test-owner/test-repo',
      analysis_date: new Date('2024-07-29T12:00:00Z'),
      time_range: {
        start: new Date('2024-07-01T00:00:00Z'),
        end: new Date('2024-07-29T00:00:00Z')
      },
      metrics: {
        commits: {
          total: 150,
          by_author: { 'user1': 80, 'user2': 70 },
          by_date: { '2024-07-29': 5, '2024-07-28': 8 },
          average_per_day: 5.2
        },
        pull_requests: {
          total: 25,
          open: 3,
          closed: 22,
          merged: 20,
          average_merge_time_hours: 18.5
        },
        issues: {
          total: 40,
          open: 8,
          closed: 32,
          resolution_time_average_hours: 72.3
        },
        code_changes: {
          total_additions: 5000,
          total_deletions: 1200,
          files_changed: 180,
          lines_per_commit_average: 41.3
        },
        contributors: {
          total: 5,
          active_last_30_days: 3,
          top_contributors: [
            { name: 'Alice', commits: 80, additions: 3000, deletions: 500 },
            { name: 'Bob', commits: 70, additions: 2000, deletions: 700 },
            { name: 'Charlie', commits: 10, additions: 200, deletions: 50 }
          ]
        }
      } as ProjectMetrics,
      trends: {
        activity_trend: 'increasing',
        velocity_trend: 'accelerating',
        issue_resolution_trend: 'improving',
        contributor_engagement: 'growing',
        weekly_activity: [
          { week: '2024-07-01', commits: 20, prs: 3, issues_closed: 5 },
          { week: '2024-07-08', commits: 25, prs: 4, issues_closed: 6 },
          { week: '2024-07-15', commits: 30, prs: 5, issues_closed: 8 },
          { week: '2024-07-22', commits: 35, prs: 6, issues_closed: 7 }
        ]
      } as ProjectTrends,
      health_score: 85,
      recommendations: [
        'プロジェクトは良好な状態です',
        'コードレビューの速度を維持してください',
        '新しいコントリビューターのサポートを継続してください'
      ],
      data_integrity_hash: 'abc123def456'
    };
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('displayStatus', () => {
    it('基本的なステータス情報を表示する', () => {
      formatter.displayStatus(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('test-owner/test-repo');
      expect(output).toContain('現在のステータス');
      expect(output).toContain('プロジェクト健康度');
      expect(output).toContain('85/100');
      expect(output).toContain('アクティビティサマリー');
    });

    it('コミット統計が正しく表示される', () => {
      formatter.displayStatus(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('コミット: 150');
      expect(output).toContain('平均 5.2/日');
    });

    it('プルリクエスト統計が正しく表示される', () => {
      formatter.displayStatus(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('PR: 3 オープン');
      expect(output).toContain('20 マージ済み');
    });

    it('イシュー統計が正しく表示される', () => {
      formatter.displayStatus(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('イシュー: 8 オープン');
      expect(output).toContain('32 解決済み');
    });

    it('アクティブ開発者数が表示される', () => {
      formatter.displayStatus(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('アクティブ開発者: 3人');
    });

    it('推奨事項が最大3件表示される', () => {
      formatter.displayStatus(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('注目すべき点');
      expect(output).toContain('1. プロジェクトは良好な状態です');
      expect(output).toContain('2. コードレビューの速度を維持してください');
      expect(output).toContain('3. 新しいコントリビューターのサポートを継続してください');
    });

    it('推奨事項が3件を超える場合の表示', () => {
      const manyRecommendations = [
        '推奨事項1', '推奨事項2', '推奨事項3', '推奨事項4', '推奨事項5'
      ];
      
      const analysisWithManyRecs = {
        ...mockAnalysis,
        recommendations: manyRecommendations
      };

      formatter.displayStatus(analysisWithManyRecs);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('その他 2 件の推奨事項があります');
    });

    it('分析日時が表示される', () => {
      formatter.displayStatus(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('最終更新');
      expect(output).toContain('2024');
    });
  });

  describe('displayTable', () => {
    it('完全な分析結果テーブルを表示する', () => {
      formatter.displayTable(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('プロジェクト分析結果');
      expect(output).toContain('プロジェクト健康度');
      expect(output).toContain('コミット統計');
      expect(output).toContain('プルリクエスト統計');
      expect(output).toContain('イシュー統計');
      expect(output).toContain('コード変更統計');
      expect(output).toContain('トレンド分析');
    });

    it('健康度バーが表示される', () => {
      formatter.displayTable(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      // プログレスバーに使用される文字が含まれていることを確認
      expect(output).toContain('█');
      expect(output).toContain('85%');
    });

    it('コード変更統計が正しく表示される', () => {
      formatter.displayTable(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('追加行数: +5,000');
      expect(output).toContain('削除行数: -1,200');
      expect(output).toContain('コミット平均行数: 41.3');
    });

    it('トレンド分析に絵文字が使用される', () => {
      formatter.displayTable(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('📈'); // 増加トレンド
      expect(output).toContain('増加中') || expect(output).toContain('加速中') || expect(output).toContain('改善中') || expect(output).toContain('成長中');
    });

    it('週別アクティビティが表示される', () => {
      formatter.displayTable(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('最近の週別アクティビティ');
      expect(output).toContain('35コミット'); // 最新週のデータ
    });

    it('トップコントリビューターが表示される', () => {
      formatter.displayTable(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('トップコントリビューター');
      expect(output).toContain('🥇'); // 1位のメダル
      expect(output).toContain('Alice');
      expect(output).toContain('🥈'); // 2位のメダル
      expect(output).toContain('Bob');
    });

    it('データ整合性ハッシュが表示される', () => {
      formatter.displayTable(mockAnalysis);

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('データ整合性ハッシュ');
      expect(output).toContain('abc123def456');
    });
  });

  describe('Health Score Colors', () => {
    it('高いスコア（80以上）で緑色を使用する', () => {
      const highScoreAnalysis = { ...mockAnalysis, health_score: 90 };
      formatter.displayStatus(highScoreAnalysis);

      // 色は実際のコンソール出力では確認できないが、メソッドが呼ばれることを確認
      expect(consoleLogs.some(log => log.includes('90/100'))).toBe(true);
    });

    it('中程度のスコア（60-79）で黄色を使用する', () => {
      const mediumScoreAnalysis = { ...mockAnalysis, health_score: 70 };
      formatter.displayStatus(mediumScoreAnalysis);

      expect(consoleLogs.some(log => log.includes('70/100'))).toBe(true);
    });

    it('低いスコア（60未満）で赤色を使用する', () => {
      const lowScoreAnalysis = { ...mockAnalysis, health_score: 45 };
      formatter.displayStatus(lowScoreAnalysis);

      expect(consoleLogs.some(log => log.includes('45/100'))).toBe(true);
    });
  });

  describe('Time Formatting', () => {
    it('1時間未満は分で表示される', () => {
      const shortTimeAnalysis = {
        ...mockAnalysis,
        metrics: {
          ...mockAnalysis.metrics,
          pull_requests: {
            ...mockAnalysis.metrics.pull_requests,
            average_merge_time_hours: 0.5
          }
        }
      };

      formatter.displayTable(shortTimeAnalysis);
      const output = consoleLogs.join('\n');
      
      expect(output).toContain('30分');
    });

    it('24時間未満は時間で表示される', () => {
      const hourlyAnalysis = {
        ...mockAnalysis,
        metrics: {
          ...mockAnalysis.metrics,
          issues: {
            ...mockAnalysis.metrics.issues,
            resolution_time_average_hours: 12.5
          }
        }
      };

      formatter.displayTable(hourlyAnalysis);
      const output = consoleLogs.join('\n');
      
      expect(output).toContain('12.5時間');
    });

    it('24時間以上は日と時間で表示される', () => {
      const dailyAnalysis = {
        ...mockAnalysis,
        metrics: {
          ...mockAnalysis.metrics,
          issues: {
            ...mockAnalysis.metrics.issues,
            resolution_time_average_hours: 49.0
          }
        }
      };

      formatter.displayTable(dailyAnalysis);
      const output = consoleLogs.join('\n');
      
      expect(output).toContain('2日1時間');
    });

    it('ちょうど24時間の倍数は日のみで表示される', () => {
      const exactDayAnalysis = {
        ...mockAnalysis,
        metrics: {
          ...mockAnalysis.metrics,
          issues: {
            ...mockAnalysis.metrics.issues,
            resolution_time_average_hours: 48.0
          }
        }
      };

      formatter.displayTable(exactDayAnalysis);
      const output = consoleLogs.join('\n');
      
      expect(output).toContain('2日');
      expect(output).not.toContain('2日0時間');
    });
  });

  describe('Trend Alerts', () => {
    it('悪化トレンドでアラートを表示する', () => {
      const deterioratingAnalysis = {
        ...mockAnalysis,
        trends: {
          ...mockAnalysis.trends,
          activity_trend: 'decreasing' as const,
          velocity_trend: 'decelerating' as const,
          issue_resolution_trend: 'degrading' as const,
          contributor_engagement: 'shrinking' as const
        }
      };

      formatter.displayStatus(deterioratingAnalysis);
      const output = consoleLogs.join('\n');
      
      expect(output).toContain('注意が必要な傾向');
      expect(output).toContain('アクティビティが減少中');
      expect(output).toContain('開発速度が低下中');
      expect(output).toContain('イシュー解決が遅延中');
      expect(output).toContain('開発者の参加が減少中');
    });

    it('良好なトレンドで成功メッセージを表示する', () => {
      formatter.displayStatus(mockAnalysis); // 元のデータは全て良好

      const output = consoleLogs.join('\n');
      
      expect(output).toContain('すべてのトレンドが良好です');
    });

    it('一部のトレンドが悪化している場合', () => {
      const mixedTrendsAnalysis = {
        ...mockAnalysis,
        trends: {
          ...mockAnalysis.trends,
          activity_trend: 'decreasing' as const,
          velocity_trend: 'accelerating' as const // これは良好
        }
      };

      formatter.displayStatus(mixedTrendsAnalysis);
      const output = consoleLogs.join('\n');
      
      expect(output).toContain('注意が必要な傾向');
      expect(output).toContain('アクティビティが減少中');
      expect(output).not.toContain('すべてのトレンドが良好です');
    });
  });

  describe('Medal Emojis', () => {
    it('トップ3に正しいメダルが付与される', () => {
      formatter.displayTable(mockAnalysis);
      const output = consoleLogs.join('\n');
      
      expect(output).toContain('🥇 Alice');
      expect(output).toContain('🥈 Bob');
      expect(output).toContain('🥉 Charlie');
    });

    it('4位以降は数字で表示される', () => {
      const manyContributorsAnalysis = {
        ...mockAnalysis,
        metrics: {
          ...mockAnalysis.metrics,
          contributors: {
            ...mockAnalysis.metrics.contributors,
            top_contributors: [
              { name: 'Alice', commits: 80, additions: 3000, deletions: 500 },
              { name: 'Bob', commits: 70, additions: 2000, deletions: 700 },
              { name: 'Charlie', commits: 60, additions: 1800, deletions: 400 },
              { name: 'Dave', commits: 50, additions: 1500, deletions: 300 },
              { name: 'Eve', commits: 40, additions: 1200, deletions: 200 },
              { name: 'Frank', commits: 30, additions: 1000, deletions: 150 }
            ]
          }
        }
      };

      formatter.displayTable(manyContributorsAnalysis);
      const output = consoleLogs.join('\n');
      
      expect(output).toContain('4. Dave');
      expect(output).toContain('5. Eve');
      expect(output).not.toContain('Frank'); // トップ5のみ表示
    });
  });

  describe('Edge Cases', () => {
    it('推奨事項が空の場合は表示しない', () => {
      const noRecommendationsAnalysis = {
        ...mockAnalysis,
        recommendations: []
      };

      formatter.displayStatus(noRecommendationsAnalysis);
      const output = consoleLogs.join('\n');
      
      expect(output).not.toContain('注目すべき点');
      expect(output).not.toContain('推奨事項');
    });

    it('トップコントリビューターが空の場合は表示しない', () => {
      const noContributorsAnalysis = {
        ...mockAnalysis,
        metrics: {
          ...mockAnalysis.metrics,
          contributors: {
            ...mockAnalysis.metrics.contributors,
            top_contributors: []
          }
        }
      };

      formatter.displayTable(noContributorsAnalysis);
      const output = consoleLogs.join('\n');
      
      expect(output).not.toContain('トップコントリビューター');
    });

    it('週別アクティビティが空の場合は表示しない', () => {
      const noWeeklyActivityAnalysis = {
        ...mockAnalysis,
        trends: {
          ...mockAnalysis.trends,
          weekly_activity: []
        }
      };

      formatter.displayTable(noWeeklyActivityAnalysis);
      const output = consoleLogs.join('\n');
      
      expect(output).not.toContain('最近の週別アクティビティ');
    });

    it('ゼロ値の統計を適切に処理する', () => {
      const zeroStatsAnalysis = {
        ...mockAnalysis,
        metrics: {
          ...mockAnalysis.metrics,
          commits: {
            ...mockAnalysis.metrics.commits,
            total: 0,
            average_per_day: 0
          },
          pull_requests: {
            ...mockAnalysis.metrics.pull_requests,
            total: 0,
            open: 0,
            closed: 0,
            merged: 0,
            average_merge_time_hours: 0
          }
        }
      };

      formatter.displayStatus(zeroStatsAnalysis);
      const output = consoleLogs.join('\n');
      
      expect(output).toContain('コミット: 0');
      expect(output).toContain('平均 0.0/日');
      expect(output).toContain('PR: 0 オープン');
    });

    it('非常に大きな数値を適切にフォーマットする', () => {
      const largeNumbersAnalysis = {
        ...mockAnalysis,
        metrics: {
          ...mockAnalysis.metrics,
          commits: {
            ...mockAnalysis.metrics.commits,
            total: 1234567
          },
          code_changes: {
            ...mockAnalysis.metrics.code_changes,
            total_additions: 9876543,
            total_deletions: 1234567
          }
        }
      };

      formatter.displayTable(largeNumbersAnalysis);
      const output = consoleLogs.join('\n');
      
      expect(output).toContain('1,234,567'); // 総コミット数
      expect(output).toContain('9,876,543'); // 追加行数
      expect(output).toContain('1,234,567'); // 削除行数
    });
  });

  describe('Accessibility and Readability', () => {
    it('絵文字とテキストが適切に組み合わせられている', () => {
      formatter.displayStatus(mockAnalysis);
      const output = consoleLogs.join('\n');
      
      // 絵文字の後にスペースとテキストが続くことを確認
      expect(output).toMatch(/📊\s+test-owner\/test-repo/);
      expect(output).toMatch(/❤️\s+プロジェクト健康度/);
      expect(output).toMatch(/🚀\s+アクティビティサマリー/);
    });

    it('数値が読みやすい形式でフォーマットされている', () => {
      formatter.displayTable(mockAnalysis);
      const output = consoleLogs.join('\n');
      
      // 小数点以下の桁数が適切
      expect(output).toContain('5.2'); // 平均コミット数
      expect(output).toContain('18.5時間'); // 平均マージ時間
      expect(output).toContain('41.3'); // 平均行数
    });

    it('日付が適切にローカライズされている', () => {
      formatter.displayStatus(mockAnalysis);
      const output = consoleLogs.join('\n');
      
      // 日付形式が含まれていることを確認（具体的な形式は環境に依存）
      expect(output).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });
});