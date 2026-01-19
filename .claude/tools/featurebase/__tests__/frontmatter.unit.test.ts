import { describe, it, expect } from 'vitest';
import { serializeFrontmatter, parseFrontmatter } from '../internal/frontmatter.js';

describe('frontmatter utilities', () => {
  const mockData = {
    featurebaseId: 'post_123',
    title: 'Test Post',
    status: 'in-progress',
    createdAt: '2026-01-12T10:00:00Z',
    tags: ['test', 'example'],
  };

  const content = 'This is the markdown content.';

  it('serializes frontmatter and content', () => {
    const markdown = serializeFrontmatter(mockData, content);

    expect(markdown).toContain('---');
    expect(markdown).toContain('featurebaseId: post_123');
    expect(markdown).toContain('This is the markdown content.');
  });

  it('parses frontmatter and content', () => {
    const markdown = `---
featurebaseId: post_123
title: Test Post
status: in-progress
createdAt: 2026-01-12T10:00:00Z
tags:
  - test
  - example
---

This is the markdown content.`;

    const { data, content: parsedContent } = parseFrontmatter(markdown);

    expect(data.featurebaseId).toBe('post_123');
    expect(data.title).toBe('Test Post');
    expect(data.tags).toEqual(['test', 'example']);
    expect(parsedContent.trim()).toBe('This is the markdown content.');
  });

  it('round-trip preserves data', () => {
    const markdown = serializeFrontmatter(mockData, content);
    const { data, content: parsedContent } = parseFrontmatter(markdown);

    expect(data).toEqual(mockData);
    expect(parsedContent.trim()).toBe(content);
  });

  describe('Security Tests', () => {
    describe('YAML Injection', () => {
      it('rejects prototype pollution attempts', () => {
        const maliciousYaml = `---
title: "Test"
__proto__:
  isAdmin: true
---
Content`;

        expect(() => parseFrontmatter(maliciousYaml)).toThrow();
      });

      it('rejects constructor pollution attempts', () => {
        const maliciousYaml = `---
title: "Test"
constructor:
  prototype:
    isAdmin: true
---
Content`;

        expect(() => parseFrontmatter(maliciousYaml)).toThrow();
      });

      it('rejects billion laughs attack', () => {
        const yamlBomb = `---
a: &a ["lol","lol","lol","lol","lol","lol","lol","lol","lol"]
b: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]
c: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]
d: &d [*c,*c,*c,*c,*c,*c,*c,*c,*c]
---
Content`;

        expect(() => parseFrontmatter(yamlBomb)).toThrow();
      });

      it('accepts safe YAML', () => {
        const safeYaml = `---
title: "Test Post"
status: "in-progress"
tags:
  - test
  - safe
---
Safe content`;

        const result = parseFrontmatter(safeYaml);
        expect(result.data.title).toBe('Test Post');
        expect(result.data.status).toBe('in-progress');
        expect(result.content.trim()).toBe('Safe content');
      });
    });
  });
});
