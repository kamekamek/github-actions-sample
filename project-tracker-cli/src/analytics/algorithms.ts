import { ProjectData, AnalysisResult, Trend, StatisticalSummary } from '../types/index.js';

/**
 * Advanced Analytics Algorithms for Project Tracking
 * Implements statistical analysis, trend detection, and pattern recognition
 */
export class AnalyticsEngine {
  
  /**
   * Calculate comprehensive statistical summary
   */
  public calculateStatistics(data: ProjectData): StatisticalSummary {
    const commits = data.commits || [];
    const prs = data.pullRequests || [];
    const issues = data.issues || [];
    
    return {
      commits: this.analyzeCommitPatterns(commits),
      pullRequests: this.analyzePRPatterns(prs),
      issues: this.analyzeIssuePatterns(issues),
      overall: this.calculateOverallHealth(data)
    };
  }
  
  /**
   * Analyze commit patterns and trends
   */
  private analyzeCommitPatterns(commits: any[]): any {
    if (commits.length === 0) return this.getEmptyCommitStats();
    
    const commitsByDate = this.groupByDate(commits);
    const commitsByAuthor = this.groupByAuthor(commits);
    const commitSizes = commits.map(c => this.calculateCommitSize(c));
    
    return {
      frequency: {
        daily: this.calculateDailyFrequency(commitsByDate),
        weekly: this.calculateWeeklyFrequency(commitsByDate)
      },
      authors: {
        distribution: this.calculateAuthorDistribution(commitsByAuthor),
        productivity: this.calculateAuthorProductivity(commitsByAuthor)
      },
      size: {
        average: this.mean(commitSizes),
        median: this.median(commitSizes),
        distribution: this.calculateSizeDistribution(commitSizes)
      },
      trends: this.detectCommitTrends(commitsByDate)
    };
  }
  
  /**
   * Analyze pull request patterns
   */
  private analyzePRPatterns(prs: any[]): any {
    if (prs.length === 0) return this.getEmptyPRStats();
    
    const mergedPRs = prs.filter(pr => pr.merged_at);
    const mergeTimes = mergedPRs.map(pr => this.calculateMergeTime(pr));
    const reviewCounts = prs.map(pr => pr.review_comments || 0);
    
    return {
      mergeTime: {
        average: this.mean(mergeTimes),
        median: this.median(mergeTimes),
        distribution: this.calculateTimeDistribution(mergeTimes)
      },
      reviewEfficiency: {
        averageReviews: this.mean(reviewCounts),
        reviewThoroughness: this.calculateReviewThoroughness(prs)
      },
      trends: this.detectPRTrends(prs)
    };
  }
  
  /**
   * Analyze issue patterns
   */
  private analyzeIssuePatterns(issues: any[]): any {
    if (issues.length === 0) return this.getEmptyIssueStats();
    
    const closedIssues = issues.filter(issue => issue.closed_at);
    const resolutionTimes = closedIssues.map(issue => this.calculateResolutionTime(issue));
    const issueTypes = this.categorizeIssues(issues);
    
    return {
      resolution: {
        averageTime: this.mean(resolutionTimes),
        medianTime: this.median(resolutionTimes),
        distribution: this.calculateTimeDistribution(resolutionTimes)
      },
      types: issueTypes,
      trends: this.detectIssueTrends(issues)
    };
  }
  
  /**
   * Calculate overall project health score
   */
  private calculateOverallHealth(data: ProjectData): any {
    const commitScore = this.calculateCommitHealth(data.commits || []);
    const prScore = this.calculatePRHealth(data.pullRequests || []);
    const issueScore = this.calculateIssueHealth(data.issues || []);
    
    const weights = { commits: 0.4, prs: 0.4, issues: 0.2 };
    const overallScore = (
      commitScore * weights.commits +
      prScore * weights.prs +
      issueScore * weights.issues
    );
    
    return {
      score: Math.round(overallScore * 100) / 100,
      breakdown: {
        commits: commitScore,
        pullRequests: prScore,
        issues: issueScore
      },
      rating: this.getHealthRating(overallScore),
      recommendations: this.generateHealthRecommendations(overallScore, {
        commits: commitScore,
        prs: prScore,
        issues: issueScore
      })
    };
  }
  
  /**
   * Detect trends in time series data
   */
  public detectTrends(data: Array<{date: string, value: number}>): Trend {
    if (data.length < 3) {
      return { direction: 'stable', strength: 0, confidence: 0 };
    }
    
    const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const slope = this.calculateLinearRegression(sortedData);
    const correlation = this.calculateCorrelation(sortedData);
    
    return {
      direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
      strength: Math.abs(slope),
      confidence: Math.abs(correlation),
      slope,
      correlation
    };
  }
  
  /**
   * Utility: Calculate linear regression slope
   */
  private calculateLinearRegression(data: Array<{date: string, value: number}>): number {
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, d) => sum + d.value, 0);
    const sumXY = data.reduce((sum, d, i) => sum + i * d.value, 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }
  
  /**
   * Utility: Calculate correlation coefficient
   */
  private calculateCorrelation(data: Array<{date: string, value: number}>): number {
    const n = data.length;
    const indices = data.map((_, i) => i);
    const values = data.map(d => d.value);
    
    const meanX = this.mean(indices);
    const meanY = this.mean(values);
    
    const numerator = indices.reduce((sum, x, i) => sum + (x - meanX) * (values[i] - meanY), 0);
    const denomX = Math.sqrt(indices.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0));
    const denomY = Math.sqrt(values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0));
    
    return numerator / (denomX * denomY);
  }
  
  /**
   * Utility functions
   */
  private mean(values: number[]): number {
    return values.length === 0 ? 0 : values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  private median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }
  
  private groupByDate(items: any[]): Map<string, any[]> {
    const groups = new Map();
    items.forEach(item => {
      const date = new Date(item.created_at || item.committed_date).toDateString();
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date).push(item);
    });
    return groups;
  }
  
  private groupByAuthor(items: any[]): Map<string, any[]> {
    const groups = new Map();
    items.forEach(item => {
      const author = item.author?.login || item.commit?.author?.name || 'Unknown';
      if (!groups.has(author)) groups.set(author, []);
      groups.get(author).push(item);
    });
    return groups;
  }
  
  // Additional utility methods...
  private calculateCommitSize(commit: any): number {
    return (commit.stats?.additions || 0) + (commit.stats?.deletions || 0);
  }
  
  private calculateMergeTime(pr: any): number {
    const created = new Date(pr.created_at).getTime();
    const merged = new Date(pr.merged_at).getTime();
    return (merged - created) / (1000 * 60 * 60); // hours
  }
  
  private calculateResolutionTime(issue: any): number {
    const created = new Date(issue.created_at).getTime();
    const closed = new Date(issue.closed_at).getTime();
    return (closed - created) / (1000 * 60 * 60 * 24); // days
  }
  
  private getHealthRating(score: number): string {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Needs Improvement';
  }
  
  private generateHealthRecommendations(overall: number, breakdown: any): string[] {
    const recommendations = [];
    
    if (breakdown.commits < 0.5) {
      recommendations.push('Increase commit frequency for better code tracking');
    }
    if (breakdown.prs < 0.5) {
      recommendations.push('Improve PR review process and merge times');
    }
    if (breakdown.issues < 0.5) {
      recommendations.push('Address issue backlog and improve resolution times');
    }
    if (overall < 0.6) {
      recommendations.push('Consider implementing stricter development practices');
    }
    
    return recommendations;
  }
  
  // Empty stats generators
  private getEmptyCommitStats() {
    return { frequency: {}, authors: {}, size: {}, trends: {} };
  }
  
  private getEmptyPRStats() {
    return { mergeTime: {}, reviewEfficiency: {}, trends: {} };
  }
  
  private getEmptyIssueStats() {
    return { resolution: {}, types: {}, trends: {} };
  }
  
  // Placeholder implementations for missing methods
  private calculateDailyFrequency(data: Map<string, any[]>): number {
    return data.size / 30; // Approximate daily frequency over 30 days
  }
  
  private calculateWeeklyFrequency(data: Map<string, any[]>): number {
    return data.size / 4; // Approximate weekly frequency
  }
  
  private calculateAuthorDistribution(data: Map<string, any[]>): any {
    const distribution: any = {};
    data.forEach((commits, author) => {
      distribution[author] = commits.length;
    });
    return distribution;
  }
  
  private calculateAuthorProductivity(data: Map<string, any[]>): any {
    const productivity: any = {};
    data.forEach((commits, author) => {
      const totalSize = commits.reduce((sum, commit) => sum + this.calculateCommitSize(commit), 0);
      productivity[author] = totalSize / commits.length;
    });
    return productivity;
  }
  
  private calculateSizeDistribution(sizes: number[]): any {
    const small = sizes.filter(s => s < 50).length;
    const medium = sizes.filter(s => s >= 50 && s < 200).length;
    const large = sizes.filter(s => s >= 200).length;
    
    return { small, medium, large };
  }
  
  private detectCommitTrends(data: Map<string, any[]>): Trend {
    const timeSeriesData = Array.from(data.entries()).map(([date, commits]) => ({
      date,
      value: commits.length
    }));
    return this.detectTrends(timeSeriesData);
  }
  
  private detectPRTrends(prs: any[]): Trend {
    const prsByDate = this.groupByDate(prs);
    const timeSeriesData = Array.from(prsByDate.entries()).map(([date, prs]) => ({
      date,
      value: prs.length
    }));
    return this.detectTrends(timeSeriesData);
  }
  
  private detectIssueTrends(issues: any[]): Trend {
    const issuesByDate = this.groupByDate(issues);
    const timeSeriesData = Array.from(issuesByDate.entries()).map(([date, issues]) => ({
      date,
      value: issues.length
    }));
    return this.detectTrends(timeSeriesData);
  }
  
  private calculateTimeDistribution(times: number[]): any {
    const quick = times.filter(t => t < 1).length;
    const normal = times.filter(t => t >= 1 && t < 7).length;
    const slow = times.filter(t => t >= 7).length;
    
    return { quick, normal, slow };
  }
  
  private calculateReviewThoroughness(prs: any[]): number {
    const totalComments = prs.reduce((sum, pr) => sum + (pr.review_comments || 0), 0);
    return prs.length > 0 ? totalComments / prs.length : 0;
  }
  
  private categorizeIssues(issues: any[]): any {
    const bugs = issues.filter(i => i.labels?.some((l: any) => l.name.toLowerCase().includes('bug'))).length;
    const features = issues.filter(i => i.labels?.some((l: any) => l.name.toLowerCase().includes('feature'))).length;
    const other = issues.length - bugs - features;
    
    return { bugs, features, other };
  }
  
  private calculateCommitHealth(commits: any[]): number {
    if (commits.length === 0) return 0.5;
    
    const recentCommits = commits.filter(c => {
      const commitDate = new Date(c.created_at || c.committed_date);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return commitDate > weekAgo;
    });
    
    return Math.min(recentCommits.length / 10, 1); // Normalize to 0-1
  }
  
  private calculatePRHealth(prs: any[]): number {
    if (prs.length === 0) return 0.5;
    
    const mergedPRs = prs.filter(pr => pr.merged_at);
    const mergeRate = mergedPRs.length / prs.length;
    
    return mergeRate;
  }
  
  private calculateIssueHealth(issues: any[]): number {
    if (issues.length === 0) return 1; // No issues is good
    
    const closedIssues = issues.filter(issue => issue.closed_at);
    const closureRate = closedIssues.length / issues.length;
    
    return closureRate;
  }
}