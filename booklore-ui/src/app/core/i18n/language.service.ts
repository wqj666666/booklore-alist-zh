import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {DEFAULT_LANGUAGE, SupportedLanguage, resolveInitialLanguage} from './language';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private static readonly STORAGE_KEY = 'booklore-ui-language';
  private languageSubject = new BehaviorSubject<SupportedLanguage>(DEFAULT_LANGUAGE);
  language$ = this.languageSubject.asObservable();

  initInitialLanguage(): void {
    const stored = localStorage.getItem(LanguageService.STORAGE_KEY);
    const initial = resolveInitialLanguage({
      storedLanguage: stored,
      browserLanguage: typeof navigator !== 'undefined' ? navigator.language : null,
      useBrowserLanguage: false
    });
    this.applyLanguage(initial);
  }

  setLanguage(language: SupportedLanguage): void {
    this.applyLanguage(language);
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.languageSubject.value;
  }

  private applyLanguage(language: SupportedLanguage): void {
    this.languageSubject.next(language);
    try {
      document.documentElement.setAttribute('lang', language);
    } catch {}
    try {
      localStorage.setItem(LanguageService.STORAGE_KEY, language);
    } catch {}
  }
}
