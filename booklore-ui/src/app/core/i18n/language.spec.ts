import { describe, expect, it } from 'vitest';
import { resolveInitialLanguage } from './language';

describe('resolveInitialLanguage', () => {
  it('defaults to zh-CN when no inputs', () => {
    expect(resolveInitialLanguage()).toBe('zh-CN');
  });

  it('prefers stored language over everything else', () => {
    expect(resolveInitialLanguage({
      storedLanguage: 'en',
      userPreferredLanguage: 'zh-CN',
      browserLanguage: 'zh-CN',
      useBrowserLanguage: true
    })).toBe('en');
  });

  it('prefers user preference when stored is absent', () => {
    expect(resolveInitialLanguage({
      storedLanguage: null,
      userPreferredLanguage: 'en',
      browserLanguage: 'zh-CN',
      useBrowserLanguage: true
    })).toBe('en');
  });

  it('uses browser language only when enabled', () => {
    expect(resolveInitialLanguage({
      storedLanguage: null,
      userPreferredLanguage: null,
      browserLanguage: 'en-US',
      useBrowserLanguage: false
    })).toBe('zh-CN');

    expect(resolveInitialLanguage({
      storedLanguage: null,
      userPreferredLanguage: null,
      browserLanguage: 'en-US',
      useBrowserLanguage: true
    })).toBe('en');
  });

  it('normalizes zh variants to zh-CN', () => {
    expect(resolveInitialLanguage({ storedLanguage: 'zh' })).toBe('zh-CN');
    expect(resolveInitialLanguage({ storedLanguage: 'zh-Hans' })).toBe('zh-CN');
    expect(resolveInitialLanguage({ storedLanguage: 'zh-TW' })).toBe('zh-CN');
  });
});

