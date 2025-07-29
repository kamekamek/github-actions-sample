/**
 * Project Tracker CLI - Main Entry Point
 * セキュリティファーストなCLIアプリケーション
 * 
 * @author Yamada Kenta - Backend Developer
 * @author Frontend Developer - CLI UI Enhancement
 * @security Input validation, error handling, secure configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync } from 'fs';
import { GitHubApiClient } from './api/github.js';
import { ProjectAnalyzer } from './core/analyzer.js';
import { createGitHubConfig, createDefaultAnalysisConfig, validateEnvironment } from './utils/config.js';
import { TrackerOptions, ProjectAnalysis } from './types/index.js';
import { CLIFormatter } from './cli/formatter.js';
import { ProgressManager } from './cli/progress.js';

/**
 * CLIプログラムのメイン関数
 * セキュリティファーストで実装
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('project-tracker')
    .description('GitHub プロジェクト進捗トラッキング CLI')
    .version('1.0.0');

  // init コマンド
  program
    .command('init')
    .argument('<repository>', 'GitHubリポジトリ (owner/repo形式)')
    .description('プロジェクトの初期化と基本情報の取得')
    .option('-v, --verbose', '詳細ログを表示')
    .action(async (repository: string, options: any) => {
      try {
        await runInitCommand(repository, options);
      } catch (error) {
        console.error(chalk.red('初期化エラー:'), error);
        process.exit(1);
      }
    });

  // status コマンド
  program
    .command('status')
    .argument('[repository]', 'GitHubリポジトリ (省略時は環境変数から取得)')
    .description('現在のプロジェクト進捗状況を表示')
    .option('-d, --days <number>', '分析期間（日数）', '7')
    .option('-f, --format <format>', '出力形式 (json|table|markdown)', 'table')
    .option('-v, --verbose', '詳細ログを表示')
    .action(async (repository: string | undefined, options: any) => {
      try {
        await runStatusCommand(repository, options);
      } catch (error) {
        console.error(chalk.red('ステータス取得エラー:'), error);
        process.exit(1);
      }
    });

  // summary コマンド
  program
    .command('summary')
    .argument('[repository]', 'GitHubリポジトリ (省略時は環境変数から取得)')
    .description('プロジェクトサマリー分析を実行')
    .option('-d, --days <number>', '分析期間（日数）', '30')
    .option('-f, --format <format>', '出力形式 (json|table|markdown)', 'table')
    .option('-o, --output <file>', '出力ファイル名')
    .option('-v, --verbose', '詳細ログを表示')
    .action(async (repository: string | undefined, options: any) => {
      try {
        await runSummaryCommand(repository, options);
      } catch (error) {
        console.error(chalk.red('サマリー分析エラー:'), error);
        process.exit(1);
      }
    });

  // report コマンド
  program
    .command('report')
    .argument('[repository]', 'GitHubリポジトリ (省略時は環境変数から取得)')
    .description('詳細レポートを生成')
    .option('-d, --days <number>', '分析期間（日数）', '30')
    .option('-f, --format <format>', '出力形式 (json|table|markdown)', 'json')
    .option('-o, --output <file>', '出力ファイル名')
    .option('--json', 'JSON形式で出力')
    .option('-v, --verbose', '詳細ログを表示')
    .action(async (repository: string | undefined, options: any) => {
      try {
        await runReportCommand(repository, options);
      } catch (error) {
        console.error(chalk.red('レポート生成エラー:'), error);
        process.exit(1);
      }
    });

  // 引数なしの場合はヘルプを表示
  if (process.argv.length <= 2) {
    program.help();
  }

  await program.parseAsync();
}

/**
 * 初期化コマンドの実行
 */
async function runInitCommand(repository: string, options: any): Promise<void> {
  const progress = new ProgressManager('プロジェクト初期化', [
    'リポジトリ情報の取得',
    'API接続テスト',
    '基本統計の収集',
    '設定ファイルの作成'
  ]);

  progress.start();

  try {
    validateEnvironment();
    
    const [owner, repo] = parseRepository(repository);
    const githubConfig = createGitHubConfig(owner, repo);
    const apiClient = new GitHubApiClient(githubConfig);

    progress.next('API接続をテスト中...');
    const isConnected = await apiClient.testConnection();
    if (!isConnected) {
      throw new Error('GitHub APIへの接続に失敗しました。');
    }

    progress.next('リポジトリ情報を取得中...');
    const repositoryResponse = await apiClient.getRepository();
    const repoInfo = repositoryResponse.data;

    progress.next('設定を作成中...');
    
    // 初期化成功メッセージ
    progress.complete('初期化完了');
    
    console.log(chalk.bold.green('\n🎉 プロジェクト初期化が完了しました！'));
    console.log(chalk.gray(`リポジトリ: ${repoInfo.full_name}`));
    console.log(chalk.gray(`説明: ${repoInfo.description || 'なし'}`));
    console.log(chalk.gray(`言語: ${repoInfo.language || '不明'}`));
    console.log(chalk.gray(`作成日: ${new Date(repoInfo.created_at).toLocaleDateString()}`));
    
    console.log(chalk.blue('\n次のコマンドを試してください:'));
    console.log(chalk.yellow(`  project-tracker status ${repository}`));
    console.log(chalk.yellow(`  project-tracker summary ${repository}`));

  } catch (error) {
    progress.fail('初期化に失敗しました');
    throw error;
  }
}

/**
 * ステータスコマンドの実行
 */
async function runStatusCommand(repository: string | undefined, options: any): Promise<void> {
  const progress = new ProgressManager('ステータス取得', [
    '設定確認',
    'リポジトリ情報取得',
    '最新アクティビティ分析'
  ]);

  progress.start();

  try {
    validateEnvironment();
    
    let owner: string, repo: string;
    if (repository) {
      [owner, repo] = parseRepository(repository);
    } else {
      owner = process.env.GITHUB_OWNER!;
      repo = process.env.GITHUB_REPO!;
      if (!owner || !repo) {
        throw new Error('リポジトリが指定されておらず、環境変数も設定されていません');
      }
    }

    const githubConfig = createGitHubConfig(owner, repo);
    let analysisConfig = createDefaultAnalysisConfig();
    
    if (options.days) {
      analysisConfig = {
        ...analysisConfig,
        time_range_days: parseInt(String(options.days), 10)
      };
    }

    const apiClient = new GitHubApiClient(githubConfig);
    const analyzer = new ProjectAnalyzer(apiClient, analysisConfig);

    progress.next('現在の状況を分析中...');
    const analysis = await analyzer.analyzeProject();

    progress.complete('ステータス取得完了');

    // ステータス専用の簡潔な表示
    const formatter = new CLIFormatter();
    formatter.displayStatus(analysis, options);

    // API使用状況表示
    if (options.verbose) {
      displayApiUsage(apiClient);
    }

  } catch (error) {
    progress.fail('ステータス取得に失敗しました');
    throw error;
  }
}

/**
 * サマリーコマンドの実行
 */
async function runSummaryCommand(repository: string | undefined, options: any): Promise<void> {
  const progress = new ProgressManager('サマリー分析', [
    '設定確認',
    'データ収集',
    'メトリクス計算',
    'トレンド分析',
    'レポート生成'
  ]);

  progress.start();

  try {
    const { apiClient, analyzer } = await setupAnalysis(repository, options, progress);
    
    progress.next('包括的な分析を実行中...');
    const analysis = await analyzer.analyzeProject();

    progress.complete('サマリー分析完了');

    await outputResults(analysis, options);

    if (options.verbose) {
      displayApiUsage(apiClient);
    }

  } catch (error) {
    progress.fail('サマリー分析に失敗しました');
    throw error;
  }
}

/**
 * レポートコマンドの実行
 */
async function runReportCommand(repository: string | undefined, options: any): Promise<void> {
  const progress = new ProgressManager('レポート生成', [
    '設定確認',
    'データ収集',
    '詳細分析',
    'レポート作成',
    'ファイル出力'
  ]);

  progress.start();

  try {
    // JSON形式をデフォルトに設定
    if (options.json) {
      options.format = 'json';
    }

    const { apiClient, analyzer } = await setupAnalysis(repository, options, progress);
    
    progress.next('詳細分析を実行中...');
    const analysis = await analyzer.analyzeProject();

    progress.next('レポートを生成中...');
    await outputResults(analysis, { ...options, format: options.format || 'json' });

    progress.complete('レポート生成完了');

    if (options.verbose) {
      displayApiUsage(apiClient);
    }

  } catch (error) {
    progress.fail('レポート生成に失敗しました');
    throw error;
  }
}

/**
 * 分析設定の共通セットアップ
 */
async function setupAnalysis(repository: string | undefined, options: any, progress: ProgressManager) {
  progress.next('設定を確認中...');
  validateEnvironment();
  
  let owner: string, repo: string;
  if (repository) {
    [owner, repo] = parseRepository(repository);
  } else {
    owner = process.env.GITHUB_OWNER!;
    repo = process.env.GITHUB_REPO!;
    if (!owner || !repo) {
      throw new Error('リポジトリが指定されておらず、環境変数も設定されていません');
    }
  }

  const githubConfig = createGitHubConfig(owner, repo);
  let analysisConfig = createDefaultAnalysisConfig();
  
  if (options.days) {
    analysisConfig = {
      ...analysisConfig,
      time_range_days: parseInt(String(options.days), 10)
    };
  }

  progress.next('API接続を確認中...');
  const apiClient = new GitHubApiClient(githubConfig);
  const isConnected = await apiClient.testConnection();
  if (!isConnected) {
    throw new Error('GitHub APIへの接続に失敗しました。');
  }

  const analyzer = new ProjectAnalyzer(apiClient, analysisConfig);
  
  return { apiClient, analyzer };
}

/**
 * API使用状況の表示
 */
function displayApiUsage(apiClient: GitHubApiClient): void {
  const rateLimitInfo = apiClient.getRateLimitInfo();
  if (rateLimitInfo) {
    console.log(chalk.blue('\n📊 API使用状況:'));
    console.log(`  残り: ${chalk.cyan(rateLimitInfo.remaining)}/${rateLimitInfo.limit}`);
    console.log(`  リセット: ${chalk.gray(rateLimitInfo.reset.toLocaleString())}`);
    
    const usagePercent = ((rateLimitInfo.limit - rateLimitInfo.remaining) / rateLimitInfo.limit * 100).toFixed(1);
    console.log(`  使用率: ${chalk.yellow(usagePercent + '%')}`);
  }
}

/**
 * リポジトリ名の解析
 * セキュリティファーストで実装
 */
function parseRepository(repository: string): [string, string] {
  const parts = repository.split('/');
  
  if (parts.length !== 2) {
    throw new Error('リポジトリは "owner/repo" の形式で指定してください');
  }

  const [owner, repo] = parts;
  
  // セキュリティ: 不正な文字をチェック
  const validPattern = /^[a-zA-Z0-9\-_.]+$/;
  if (!validPattern.test(owner) || !validPattern.test(repo)) {
    throw new Error('セキュリティファーストで: リポジトリ名に不正な文字が含まれています');
  }

  return [owner, repo];
}

/**
 * 結果の出力
 * パフォーマンス測定してみましょう
 */
async function outputResults(analysis: ProjectAnalysis, options: TrackerOptions): Promise<void> {
  const format = options.format || 'table';
  const formatter = new CLIFormatter();

  switch (format) {
    case 'json':
      await outputJson(analysis, options.output);
      break;
    case 'markdown':
      await outputMarkdown(analysis, options.output);
      break;
    case 'table':
    default:
      formatter.displayTable(analysis);
      break;
  }
}

/**
 * JSON形式での出力
 */
async function outputJson(analysis: ProjectAnalysis, outputFile?: string): Promise<void> {
  const json = JSON.stringify(analysis, null, 2);
  
  if (outputFile) {
    try {
      writeFileSync(outputFile, json, 'utf8');
      console.log(chalk.green(`\n✅ JSONレポートを出力しました: ${outputFile}`));
    } catch (error) {
      console.error(chalk.red('ファイル出力エラー:'), error);
      console.log('\n標準出力に出力します:');
      console.log(json);
    }
  } else {
    console.log(json);
  }
}

/**
 * テーブル形式での出力
 */
function outputTable(analysis: ProjectAnalysis): void {
  console.log(chalk.bold.blue(`\n🔍 ${analysis.repository} - プロジェクト分析結果`));
  console.log(chalk.gray(`分析期間: ${analysis.time_range.start.toLocaleDateString()} 〜 ${analysis.time_range.end.toLocaleDateString()}`));
  console.log(chalk.gray(`分析日時: ${analysis.analysis_date.toLocaleString()}`));

  // ヘルススコア
  const healthColor = analysis.health_score >= 80 ? 'green' : 
                     analysis.health_score >= 60 ? 'yellow' : 'red';
  console.log(chalk.bold(`\n📊 プロジェクト健康度: ${chalk[healthColor](analysis.health_score + '/100')}`));

  // コミット情報
  console.log(chalk.bold('\n📝 コミット統計:'));
  console.log(`  総コミット数: ${chalk.cyan(analysis.metrics.commits.total.toLocaleString())}`);
  console.log(`  1日平均: ${chalk.cyan(analysis.metrics.commits.average_per_day.toFixed(1))}`);
  console.log(`  アクティブコントリビューター: ${chalk.cyan(analysis.metrics.contributors.active_last_30_days)}`);

  // プルリクエスト情報
  console.log(chalk.bold('\n🔄 プルリクエスト統計:'));
  console.log(`  総PR数: ${chalk.cyan(analysis.metrics.pull_requests.total)}`);
  console.log(`  マージ済み: ${chalk.green(analysis.metrics.pull_requests.merged)}`);
  console.log(`  オープン中: ${chalk.yellow(analysis.metrics.pull_requests.open)}`);
  console.log(`  平均マージ時間: ${chalk.cyan(analysis.metrics.pull_requests.average_merge_time_hours.toFixed(1))}時間`);

  // イシュー情報
  console.log(chalk.bold('\n🐛 イシュー統計:'));
  console.log(`  総イシュー数: ${chalk.cyan(analysis.metrics.issues.total)}`);
  console.log(`  解決済み: ${chalk.green(analysis.metrics.issues.closed)}`);
  console.log(`  未解決: ${chalk.yellow(analysis.metrics.issues.open)}`);
  console.log(`  平均解決時間: ${chalk.cyan(analysis.metrics.issues.resolution_time_average_hours.toFixed(1))}時間`);

  // コード変更統計
  console.log(chalk.bold('\n📈 コード変更統計:'));
  console.log(`  追加行数: ${chalk.green('+' + analysis.metrics.code_changes.total_additions.toLocaleString())}`);
  console.log(`  削除行数: ${chalk.red('-' + analysis.metrics.code_changes.total_deletions.toLocaleString())}`);
  console.log(`  コミット平均行数: ${chalk.cyan(analysis.metrics.code_changes.lines_per_commit_average.toFixed(1))}`);

  // トレンド情報
  console.log(chalk.bold('\n📊 トレンド分析:'));
  console.log(`  アクティビティ: ${getTrendEmoji(analysis.trends.activity_trend)} ${analysis.trends.activity_trend}`);
  console.log(`  開発速度: ${getTrendEmoji(analysis.trends.velocity_trend)} ${analysis.trends.velocity_trend}`);
  console.log(`  イシュー解決: ${getTrendEmoji(analysis.trends.issue_resolution_trend)} ${analysis.trends.issue_resolution_trend}`);
  console.log(`  コントリビューター: ${getTrendEmoji(analysis.trends.contributor_engagement)} ${analysis.trends.contributor_engagement}`);

  // 推奨事項
  if (analysis.recommendations.length > 0) {
    console.log(chalk.bold('\n💡 推奨事項:'));
    analysis.recommendations.forEach((recommendation, index) => {
      console.log(`  ${index + 1}. ${recommendation}`);
    });
  }

  // トップコントリビューター
  if (analysis.metrics.contributors.top_contributors.length > 0) {
    console.log(chalk.bold('\n🏆 トップコントリビューター:'));
    analysis.metrics.contributors.top_contributors.slice(0, 5).forEach((contributor, index) => {
      console.log(`  ${index + 1}. ${chalk.cyan(contributor.name)} - ${contributor.commits}コミット`);
    });
  }

  console.log(chalk.gray(`\nデータ整合性ハッシュ: ${analysis.data_integrity_hash}`));
}

/**
 * Markdown形式での出力
 */
async function outputMarkdown(analysis: ProjectAnalysis, outputFile?: string): Promise<void> {
  const markdown = generateMarkdownReport(analysis);
  
  if (outputFile) {
    try {
      writeFileSync(outputFile, markdown, 'utf8');
      console.log(chalk.green(`\n✅ Markdownレポートを出力しました: ${outputFile}`));
    } catch (error) {
      console.error(chalk.red('ファイル出力エラー:'), error);
      console.log('\n標準出力に出力します:');
      console.log(markdown);
    }
  } else {
    console.log(markdown);
  }
}

/**
 * Markdownレポート生成
 */
function generateMarkdownReport(analysis: ProjectAnalysis): string {
  return `
# 📊 ${analysis.repository} - プロジェクト分析レポート

**分析期間**: ${analysis.time_range.start.toLocaleDateString()} 〜 ${analysis.time_range.end.toLocaleDateString()}  
**分析日時**: ${analysis.analysis_date.toLocaleString()}  
**健康度スコア**: ${analysis.health_score}/100

## 📝 コミット統計
- **総コミット数**: ${analysis.metrics.commits.total.toLocaleString()}
- **1日平均**: ${analysis.metrics.commits.average_per_day.toFixed(1)}
- **アクティブコントリビューター**: ${analysis.metrics.contributors.active_last_30_days}

## 🔄 プルリクエスト統計
- **総PR数**: ${analysis.metrics.pull_requests.total}
- **マージ済み**: ${analysis.metrics.pull_requests.merged}
- **オープン中**: ${analysis.metrics.pull_requests.open}
- **平均マージ時間**: ${analysis.metrics.pull_requests.average_merge_time_hours.toFixed(1)}時間

## 🐛 イシュー統計
- **総イシュー数**: ${analysis.metrics.issues.total}
- **解決済み**: ${analysis.metrics.issues.closed}
- **未解決**: ${analysis.metrics.issues.open}
- **平均解決時間**: ${analysis.metrics.issues.resolution_time_average_hours.toFixed(1)}時間

## 📈 トレンド分析
- **アクティビティ**: ${analysis.trends.activity_trend}
- **開発速度**: ${analysis.trends.velocity_trend}
- **イシュー解決**: ${analysis.trends.issue_resolution_trend}
- **コントリビューター**: ${analysis.trends.contributor_engagement}

## 💡 推奨事項
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*データ整合性ハッシュ: ${analysis.data_integrity_hash}*
`;
}

/**
 * トレンド表示用絵文字取得
 */
function getTrendEmoji(trend: string): string {
  switch (trend) {
    case 'increasing':
    case 'accelerating':
    case 'improving':
    case 'growing':
      return '📈';
    case 'decreasing':
    case 'decelerating':
    case 'degrading':
    case 'shrinking':
      return '📉';
    case 'stable':
    case 'consistent':
    default:
      return '➡️';
  }
}

// メイン関数実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('予期しないエラーが発生しました:'), error);
    process.exit(1);
  });
}

export { main };