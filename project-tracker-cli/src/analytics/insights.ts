import { ProjectData, Insight, Recommendation } from '../types/index.js';
import { AnalyticsEngine } from './algorithms.js';

/**
 * Intelligent Insights Generator
 * Converts statistical data into actionable insights and recommendations
 */
export class InsightsEngine {
  private analytics: AnalyticsEngine;
  
  constructor() {
    this.analytics = new AnalyticsEngine();
  }
  
  /**
   * Generate comprehensive insights from project data
   */
  public generateInsights(data: ProjectData): Insight[] {
    const insights: Insight[] = [];
    const stats = this.analytics.calculateStatistics(data);
    
    // Productivity insights
    insights.push(...this.analyzeProductivity(data, stats));
    
    // Quality insights
    insights.push(...this.analyzeQuality(data, stats));
    
    // Team collaboration insights
    insights.push(...this.analyzeCollaboration(data, stats));
    
    // Project health insights
    insights.push(...this.analyzeProjectHealth(data, stats));
    
    // Performance insights
    insights.push(...this.analyzePerformance(data, stats));
    
    return insights.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Generate actionable recommendations
   */
  public generateRecommendations(data: ProjectData): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const stats = this.analytics.calculateStatistics(data);
    
    // Development process recommendations
    recommendations.push(...this.getProcessRecommendations(stats));
    
    // Team management recommendations
    recommendations.push(...this.getTeamRecommendations(stats));
    
    // Quality improvements
    recommendations.push(...this.getQualityRecommendations(stats));
    
    return recommendations.sort((a, b) => b.impact - a.impact);
  }
  
  /**
   * Analyze productivity patterns
   */
  private analyzeProductivity(data: ProjectData, stats: any): Insight[] {
    const insights: Insight[] = [];
    
    // Commit frequency analysis
    if (stats.commits?.frequency?.daily < 1) {
      insights.push({
        type: 'productivity',
        title: 'Low Commit Frequency Detected',
        description: `Average daily commits (${stats.commits.frequency.daily.toFixed(1)}) is below recommended threshold`,
        impact: 'medium',
        priority: 7,
        actionable: true,
        data: {
          current: stats.commits.frequency.daily,
          recommended: 2,
          improvement: 'Encourage more frequent, smaller commits'
        }
      });
    }
    
    // Large commit analysis
    if (stats.commits?.size?.average > 500) {
      insights.push({
        type: 'productivity',
        title: 'Large Commits Detected',
        description: `Average commit size (${Math.round(stats.commits.size.average)} lines) suggests commits could be smaller`,
        impact: 'low',
        priority: 4,
        actionable: true,
        data: {
          averageSize: stats.commits.size.average,
          recommendation: 'Break down large changes into smaller, focused commits'
        }
      });
    }
    
    // Author productivity distribution
    if (stats.commits?.authors?.distribution) {
      const authors = Object.keys(stats.commits.authors.distribution);
      const commitCounts = Object.values(stats.commits.authors.distribution) as number[];
      const maxCommits = Math.max(...commitCounts);
      const minCommits = Math.min(...commitCounts);
      
      if (authors.length > 1 && (maxCommits / minCommits) > 5) {
        insights.push({
          type: 'team',
          title: 'Uneven Contribution Distribution',
          description: 'Large disparity in commit contributions between team members',
          impact: 'medium',
          priority: 6,
          actionable: true,
          data: {
            maxContributor: maxCommits,
            minContributor: minCommits,
            ratio: maxCommits / minCommits,
            suggestion: 'Consider pair programming or task redistribution'
          }
        });
      }
    }
    
    return insights;
  }
  
  /**
   * Analyze code quality patterns
   */
  private analyzeQuality(data: ProjectData, stats: any): Insight[] {
    const insights: Insight[] = [];
    
    // PR review analysis
    if (stats.pullRequests?.reviewEfficiency?.averageReviews < 1) {
      insights.push({
        type: 'quality',
        title: 'Insufficient Code Review',
        description: 'Pull requests are receiving minimal review comments',
        impact: 'high',
        priority: 9,
        actionable: true,
        data: {
          currentReviews: stats.pullRequests.reviewEfficiency.averageReviews,
          recommendation: 'Implement stricter review requirements'
        }
      });
    }
    
    // Merge time analysis
    if (stats.pullRequests?.mergeTime?.average > 168) { // 1 week
      insights.push({
        type: 'process',
        title: 'Slow Pull Request Merge Times',
        description: `Average merge time (${Math.round(stats.pullRequests.mergeTime.average)} hours) is affecting development velocity`,
        impact: 'medium',
        priority: 7,
        actionable: true,
        data: {
          currentTime: stats.pullRequests.mergeTime.average,
          recommendedTime: 48,
          suggestion: 'Streamline review process and set merge time targets'
        }
      });
    }
    
    return insights;
  }
  
  /**
   * Analyze team collaboration patterns
   */
  private analyzeCollaboration(data: ProjectData, stats: any): Insight[] {
    const insights: Insight[] = [];
    
    // Issue resolution analysis
    if (stats.issues?.resolution?.averageTime > 14) { // 2 weeks
      insights.push({
        type: 'collaboration',
        title: 'Slow Issue Resolution',
        description: `Issues taking ${Math.round(stats.issues.resolution.averageTime)} days on average to resolve`,
        impact: 'medium',
        priority: 6,
        actionable: true,
        data: {
          currentTime: stats.issues.resolution.averageTime,
          targetTime: 7,
          improvement: 'Implement issue triage and priority system'
        }
      });
    }
    
    // Issue type distribution
    if (stats.issues?.types?.bugs > stats.issues?.types?.features * 2) {
      insights.push({
        type: 'quality',
        title: 'High Bug-to-Feature Ratio',
        description: 'Bug reports significantly outnumber feature requests',
        impact: 'high',
        priority: 8,
        actionable: true,
        data: {
          bugs: stats.issues.types.bugs,
          features: stats.issues.types.features,
          ratio: stats.issues.types.bugs / stats.issues.types.features,
          suggestion: 'Focus on improving code quality and testing'
        }
      });
    }
    
    return insights;
  }
  
  /**
   * Analyze overall project health
   */
  private analyzeProjectHealth(data: ProjectData, stats: any): Insight[] {
    const insights: Insight[] = [];
    
    if (stats.overall?.score < 0.6) {
      insights.push({
        type: 'health',
        title: 'Project Health Below Target',
        description: `Overall health score (${(stats.overall.score * 100).toFixed(1)}%) indicates areas for improvement`,
        impact: 'high',
        priority: 10,
        actionable: true,
        data: {
          currentScore: stats.overall.score,
          targetScore: 0.8,
          breakdown: stats.overall.breakdown,
          recommendations: stats.overall.recommendations
        }
      });
    }
    
    return insights;
  }
  
  /**
   * Analyze performance trends
   */
  private analyzePerformance(data: ProjectData, stats: any): Insight[] {
    const insights: Insight[] = [];
    
    // Trend analysis
    if (stats.commits?.trends?.direction === 'decreasing' && stats.commits.trends.confidence > 0.7) {
      insights.push({
        type: 'trend',
        title: 'Declining Commit Activity',
        description: 'Commit frequency shows a declining trend over time',
        impact: 'medium',
        priority: 6,
        actionable: true,
        data: {
          trend: stats.commits.trends,
          suggestion: 'Investigate potential blockers or team capacity issues'
        }
      });
    }
    
    if (stats.pullRequests?.trends?.direction === 'increasing' && stats.pullRequests.trends.confidence > 0.7) {
      insights.push({
        type: 'trend',
        title: 'Growing PR Backlog',
        description: 'Pull request creation rate is outpacing merge rate',
        impact: 'medium',
        priority: 7,
        actionable: true,
        data: {
          trend: stats.pullRequests.trends,
          suggestion: 'Increase review capacity or streamline approval process'
        }
      });
    }
    
    return insights;
  }
  
  /**
   * Generate process improvement recommendations
   */
  private getProcessRecommendations(stats: any): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    if (stats.pullRequests?.mergeTime?.average > 72) {
      recommendations.push({
        category: 'process',
        title: 'Implement PR Size Guidelines',
        description: 'Establish maximum PR size limits to improve review speed',
        priority: 'high',
        impact: 8,
        effort: 'low',
        timeline: '1 week',
        steps: [
          'Define PR size limits (< 400 lines)',
          'Add automated PR size checks',
          'Create guidance documentation',
          'Train team on best practices'
        ]
      });
    }
    
    if (stats.commits?.frequency?.daily < 1) {
      recommendations.push({
        category: 'development',
        title: 'Encourage Frequent Commits',
        description: 'Promote smaller, more frequent commits for better tracking',
        priority: 'medium',
        impact: 6,
        effort: 'low',
        timeline: '2 weeks',
        steps: [
          'Educate team on commit best practices',
          'Set up commit message templates',
          'Implement pre-commit hooks',
          'Monitor commit frequency metrics'
        ]
      });
    }
    
    return recommendations;
  }
  
  /**
   * Generate team management recommendations
   */
  private getTeamRecommendations(stats: any): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    if (stats.commits?.authors?.distribution) {
      const commitCounts = Object.values(stats.commits.authors.distribution) as number[];
      const maxCommits = Math.max(...commitCounts);
      const minCommits = Math.min(...commitCounts);
      
      if ((maxCommits / minCommits) > 5) {
        recommendations.push({
          category: 'team',
          title: 'Balance Workload Distribution',
          description: 'Address uneven contribution patterns among team members',
          priority: 'medium',
          impact: 7,
          effort: 'medium',
          timeline: '3 weeks',
          steps: [
            'Analyze individual capacity and skills',
            'Redistribute tasks more evenly',
            'Implement pair programming sessions',
            'Regular one-on-ones to identify blockers'
          ]
        });
      }
    }
    
    return recommendations;
  }
  
  /**
   * Generate quality improvement recommendations
   */
  private getQualityRecommendations(stats: any): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    if (stats.pullRequests?.reviewEfficiency?.averageReviews < 1) {
      recommendations.push({
        category: 'quality',
        title: 'Strengthen Code Review Process',
        description: 'Implement more thorough code review practices',
        priority: 'high',
        impact: 9,
        effort: 'medium',
        timeline: '2 weeks',
        steps: [
          'Require minimum 2 reviewers per PR',
          'Create code review checklist',
          'Set up automated quality gates',
          'Train team on effective review techniques'
        ]
      });
    }
    
    if (stats.issues?.types?.bugs > stats.issues?.types?.features) {
      recommendations.push({
        category: 'quality',
        title: 'Improve Testing Strategy',
        description: 'Reduce bug reports through better testing practices',
        priority: 'high',
        impact: 8,
        effort: 'high',
        timeline: '4 weeks',
        steps: [
          'Audit current test coverage',
          'Implement automated testing pipeline',
          'Add integration and e2e tests',
          'Establish quality metrics and targets'
        ]
      });
    }
    
    return recommendations;
  }
}