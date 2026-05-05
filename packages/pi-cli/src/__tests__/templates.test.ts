import { describe, test, expect } from 'bun:test';
import { getAllTemplates, getTemplateInfo, resolveTemplateDir } from '../lib/templates';

describe('getAllTemplates', () => {
  test('returns 3 templates', () => {
    const templates = getAllTemplates();
    expect(templates).toHaveLength(3);
  });

  test('includes general, chat, agent types', () => {
    const templates = getAllTemplates();
    const types = templates.map((t) => t.type);
    expect(types).toContain('general');
    expect(types).toContain('chat');
    expect(types).toContain('agent');
  });

  test('all templates are available', () => {
    const templates = getAllTemplates();
    for (const t of templates) {
      expect(t.available).toBe(true);
    }
  });

  test('each template has required fields', () => {
    const templates = getAllTemplates();
    for (const t of templates) {
      expect(t.type).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.dir).toBeTruthy();
      expect(typeof t.available).toBe('boolean');
    }
  });
});

describe('getTemplateInfo', () => {
  test('returns info for "general"', () => {
    const info = getTemplateInfo('general');
    expect(info).toBeDefined();
    expect(info!.type).toBe('general');
    expect(info!.dir).toBe('templates/general');
  });

  test('returns info for "chat"', () => {
    const info = getTemplateInfo('chat');
    expect(info).toBeDefined();
    expect(info!.type).toBe('chat');
  });

  test('returns info for "agent"', () => {
    const info = getTemplateInfo('agent');
    expect(info).toBeDefined();
    expect(info!.type).toBe('agent');
  });

  test('returns undefined for unknown type', () => {
    expect(getTemplateInfo('nonexistent')).toBeUndefined();
    expect(getTemplateInfo('')).toBeUndefined();
  });
});

describe('resolveTemplateDir', () => {
  test('resolves general template path', () => {
    const dir = resolveTemplateDir('/fake/root', 'general');
    expect(dir).toBe('/fake/root/templates/general');
  });

  test('resolves chat template path', () => {
    const dir = resolveTemplateDir('/fake/root', 'chat');
    expect(dir).toBe('/fake/root/templates/chat');
  });

  test('resolves agent template path', () => {
    const dir = resolveTemplateDir('/fake/root', 'agent');
    expect(dir).toBe('/fake/root/templates/agent');
  });

  test('throws for invalid template type', () => {
    expect(() => resolveTemplateDir('/root', 'invalid')).toThrow(
      'Unknown template type: "invalid"',
    );
  });

  test('throws with empty string', () => {
    expect(() => resolveTemplateDir('/root', '')).toThrow('Unknown template type');
  });
});
