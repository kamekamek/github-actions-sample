# Project Tracker CLI

A powerful command-line tool for tracking project progress through GitHub API integration. Built by AI Virtual Corporation with security-first principles and advanced analytics.

## 🚀 Features

- **GitHub Integration**: Seamless connection to GitHub repositories
- **Advanced Analytics**: Statistical analysis and trend detection
- **Security-First**: Enterprise-grade security and data protection
- **Intelligent Insights**: AI-powered recommendations and insights
- **Multiple Output Formats**: JSON, Table, and Markdown support
- **Comprehensive Testing**: 80%+ test coverage with security focus

## 📦 Installation

```bash
git clone <repository-url>
cd project-tracker-cli
npm install
npm run build
```

## 🔧 Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Set your GitHub token:
```bash
export GITHUB_TOKEN=your_github_token_here
```

## 💻 Usage

### Basic Commands

```bash
# Initialize project tracking
npm start init owner/repository

# Check current status
npm start status

# Generate summary analysis
npm start summary

# Generate detailed report
npm start report --format json
```

### Advanced Options

```bash
# Analyze specific time period
npm start summary --days 30

# Output in different formats
npm start report --format table
npm start report --format markdown

# Verbose output
npm start status --verbose
```

## 📊 Output Examples

### Status Command
```bash
$ npm start status

📈 Project Health Score: 85%
🔄 Recent Activity: 23 commits, 5 PRs, 3 issues
👥 Contributors: 4 active developers
⏱️  Average PR Merge Time: 2.3 hours
```

### Summary Analysis
```bash
$ npm start summary

=== PROJECT ANALYSIS SUMMARY ===

📊 Commits Analysis:
  • Daily frequency: 3.2 commits
  • Average size: 127 lines
  • Most active: Alice (42%)

🔄 Pull Requests:
  • Average merge time: 2.3 hours
  • Review thoroughness: 4.2/5
  • Success rate: 94%

🎯 Issues Management:
  • Average resolution: 3.1 days  
  • Bug ratio: 0.3 (healthy)
  • Open issues: 7

💡 Key Insights:
  • Strong commit frequency trend
  • Efficient review process
  • Well-balanced workload distribution
```

## 🏗️ Architecture

```
src/
├── api/           # GitHub API integration
├── analytics/     # Statistical analysis engine
├── cli/          # Command-line interface
├── core/         # Project analysis logic
├── security/     # Security and validation
├── types/        # TypeScript definitions
└── utils/        # Configuration and utilities
```

## 🔒 Security Features

- **AES-256 Encryption**: Secure token storage
- **Input Validation**: Comprehensive sanitization
- **HTTPS Enforcement**: All API communications encrypted
- **Zero Trust**: All inputs validated and verified
- **Security Auditing**: Comprehensive security logging

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 📈 Analytics Features

### Statistical Analysis
- Commit frequency and patterns
- Pull request metrics and trends
- Issue resolution analysis
- Team productivity insights

### Intelligent Insights
- Productivity optimization suggestions
- Code quality improvements
- Team collaboration recommendations
- Project health monitoring

### Trend Detection
- Linear regression analysis
- Correlation coefficient calculation
- Pattern recognition
- Predictive analytics

## 🎯 Health Scoring

The tool calculates an overall project health score based on:

- **Commits (40%)**: Frequency, size, distribution
- **Pull Requests (40%)**: Merge time, review quality
- **Issues (20%)**: Resolution time, bug ratio

Score ranges:
- 80-100%: Excellent
- 60-79%: Good  
- 40-59%: Fair
- 0-39%: Needs Improvement

## 🔧 Development

```bash
# Development mode
npm run dev

# Build project
npm run build

# Lint code
npm run lint

# Type check
npm run type-check
```

## 📝 API Documentation

### Core Classes

- **`GitHubClient`**: API integration and data fetching
- **`ProjectAnalyzer`**: Core analysis engine
- **`AnalyticsEngine`**: Statistical calculations
- **`InsightsEngine`**: Intelligent recommendations
- **`SecurityValidator`**: Input validation and security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Run security validation
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and support:
- GitHub Issues: [Repository Issues](https://github.com/ai-virtual-corp/project-tracker-cli/issues)
- Documentation: [Wiki](https://github.com/ai-virtual-corp/project-tracker-cli/wiki)
- Security Issues: security@ai-virtual-corp.com

---

**Built with ❤️ by AI Virtual Corporation**