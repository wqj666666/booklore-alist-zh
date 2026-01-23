export type SupportedLanguage = 'zh-CN' | 'en';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-CN';
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['zh-CN', 'en'];

export interface ResolveInitialLanguageOptions {
  storedLanguage?: string | null;
  userPreferredLanguage?: string | null;
  browserLanguage?: string | null;
  useBrowserLanguage?: boolean;
}

export function normalizeToSupportedLanguage(language: string | null | undefined): SupportedLanguage | null {
  if (!language) return null;

  const normalized = language.trim().toLowerCase();

  if (normalized === 'zh-cn' || normalized === 'zh' || normalized.startsWith('zh-')) return 'zh-CN';
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';

  return null;
}

export function resolveInitialLanguage(options: ResolveInitialLanguageOptions = {}): SupportedLanguage {
  const stored = normalizeToSupportedLanguage(options.storedLanguage);
  if (stored) return stored;

  const userPreferred = normalizeToSupportedLanguage(options.userPreferredLanguage);
  if (userPreferred) return userPreferred;

  if (options.useBrowserLanguage) {
    const browser = normalizeToSupportedLanguage(options.browserLanguage);
    if (browser) return browser;
  }

  return DEFAULT_LANGUAGE;
}

