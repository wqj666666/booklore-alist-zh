import {inject, Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, combineLatest, EMPTY, Observable, Subject} from 'rxjs';
import {takeUntil, catchError, filter, first, switchMap} from 'rxjs/operators';
import {ChartConfiguration, ChartData, Chart, TooltipItem} from 'chart.js';

import {LibraryFilterService} from './library-filter.service';
import {BookService} from '../../book/service/book.service';
import {Book} from '../../book/model/book.model';
import {BookState} from '../../book/model/state/book-state.model';
import {TranslateService} from '@ngx-translate/core';
import {LanguageService} from '../../../core/i18n/language.service';

interface LanguageStats {
  language: string;
  count: number;
  percentage: number;
}

const CHART_COLORS = [
  '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
  '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab',
  '#17becf', '#bcbd22', '#1f77b4', '#ff7f0e', '#2ca02c'
] as const;

const CHART_DEFAULTS = {
  borderColor: '#ffffff',
  borderWidth: 2,
  hoverBorderWidth: 3,
  hoverBorderColor: '#ffffff'
} as const;

type LanguageChartData = ChartData<'doughnut', number[], string>;

const UNKNOWN_LANGUAGE_ID = '__UNKNOWN__';

@Injectable({
  providedIn: 'root'
})
export class LanguageDistributionChartService implements OnDestroy {
  private readonly bookService = inject(BookService);
  private readonly libraryFilterService = inject(LibraryFilterService);
  private readonly translateService = inject(TranslateService);
  private readonly languageService = inject(LanguageService);
  private readonly destroy$ = new Subject<void>();

  public readonly languageChartType = 'doughnut' as const;

  public languageChartOptions: ChartConfiguration<'doughnut'>['options'] = this.buildOptions();

  private readonly languageChartDataSubject = new BehaviorSubject<LanguageChartData>({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [...CHART_COLORS],
      ...CHART_DEFAULTS
    }]
  });

  public readonly languageChartData$: Observable<LanguageChartData> = this.languageChartDataSubject.asObservable();

  constructor() {
    this.bookService.bookState$
      .pipe(
        filter(state => state.loaded),
        first(),
        switchMap(() =>
          combineLatest([
            this.libraryFilterService.selectedLibrary$,
            this.languageService.language$
          ]).pipe(takeUntil(this.destroy$))
        ),
        catchError((error) => {
          console.error('Error processing language stats:', error);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.languageChartOptions = this.buildOptions();
        const stats = this.calculateLanguageStats();
        this.updateChartData(stats);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateChartData(stats: LanguageStats[]): void {
    try {
      const topLanguages = stats.slice(0, 12); // Show top 12 languages
      const labels = topLanguages.map(s => this.getDisplayLanguageName(s.language));
      const dataValues = topLanguages.map(s => s.count);
      const colors = this.getColorsForData(topLanguages.length);

      this.languageChartDataSubject.next({
        labels,
        datasets: [{
          data: dataValues,
          backgroundColor: colors,
          ...CHART_DEFAULTS
        }]
      });
    } catch (error) {
      console.error('Error updating language chart data:', error);
    }
  }

  private getColorsForData(dataLength: number): string[] {
    const colors = [...CHART_COLORS];
    while (colors.length < dataLength) {
      colors.push(...CHART_COLORS);
    }
    return colors.slice(0, dataLength);
  }

  private calculateLanguageStats(): LanguageStats[] {
    const currentState = this.bookService.getCurrentBookState();
    const selectedLibraryId = this.libraryFilterService.getCurrentSelectedLibrary();

    if (!this.isValidBookState(currentState)) {
      return [];
    }

    const filteredBooks = this.filterBooksByLibrary(currentState.books!, String(selectedLibraryId));
    return this.processLanguageStats(filteredBooks);
  }

  private isValidBookState(state: unknown): state is BookState {
    return (
      typeof state === 'object' &&
      state !== null &&
      'loaded' in state &&
      typeof (state as {loaded: boolean}).loaded === 'boolean' &&
      'books' in state &&
      Array.isArray((state as {books: unknown}).books) &&
      (state as {books: Book[]}).books.length > 0
    );
  }

  private filterBooksByLibrary(books: Book[], selectedLibraryId: string | null): Book[] {
    return selectedLibraryId && selectedLibraryId !== 'null'
      ? books.filter(book => String(book.libraryId) === selectedLibraryId)
      : books;
  }

  private processLanguageStats(books: Book[]): LanguageStats[] {
    if (books.length === 0) {
      return [];
    }

    const languageMap = this.buildLanguageMap(books);
    return this.convertMapToStats(languageMap, books.length);
  }

  private buildLanguageMap(books: Book[]): Map<string, number> {
    const languageMap = new Map<string, number>();

    for (const book of books) {
      const language = book.metadata?.language;
      if (language && language.trim()) {
        const normalizedLanguage = this.normalizeLanguage(language.trim());
        languageMap.set(normalizedLanguage, (languageMap.get(normalizedLanguage) || 0) + 1);
      } else {
        languageMap.set(UNKNOWN_LANGUAGE_ID, (languageMap.get(UNKNOWN_LANGUAGE_ID) || 0) + 1);
      }
    }

    return languageMap;
  }

  private normalizeLanguage(language: string): string {
    const languageMap: Record<string, string> = {
      en: 'en',
      eng: 'en',
      english: 'en',
      es: 'es',
      spa: 'es',
      spanish: 'es',
      fr: 'fr',
      fre: 'fr',
      fra: 'fr',
      french: 'fr',
      de: 'de',
      ger: 'de',
      deu: 'de',
      german: 'de',
      it: 'it',
      ita: 'it',
      italian: 'it',
      pt: 'pt',
      por: 'pt',
      portuguese: 'pt',
      ru: 'ru',
      rus: 'ru',
      russian: 'ru',
      ja: 'ja',
      jpn: 'ja',
      japanese: 'ja',
      zh: 'zh',
      chi: 'zh',
      chinese: 'zh',
      ko: 'ko',
      kor: 'ko',
      korean: 'ko',
      ar: 'ar',
      ara: 'ar',
      arabic: 'ar'
    };

    const normalized = language.toLowerCase();
    return languageMap[normalized] || this.capitalizeFirst(language);
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  private convertMapToStats(languageMap: Map<string, number>, totalBooks: number): LanguageStats[] {
    return Array.from(languageMap.entries())
      .map(([language, count]) => ({
        language,
        count,
        percentage: Number(((count / totalBooks) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);
  }

  private generateLegendLabels(chart: Chart) {
    const data = chart.data;
    if (!data.labels?.length || !data.datasets?.[0]?.data?.length) {
      return [];
    }

    const dataset = data.datasets[0];
    const dataValues = dataset.data as number[];

    return data.labels.map((label: unknown, index: number) => {
      const isVisible = typeof chart.getDataVisibility === 'function'
        ? chart.getDataVisibility(index)
        : !((chart.getDatasetMeta && (chart.getDatasetMeta(0)?.data?.[index] as any)?.hidden) || false);

      return {
        text: `${String(label)} (${dataValues[index]})`,
        fillStyle: (dataset.backgroundColor as string[])[index],
        strokeStyle: '#ffffff',
        lineWidth: 1,
        hidden: !isVisible,
        index,
        fontColor: '#ffffff'
      };
    });
  }

  private formatTooltipLabel(context: TooltipItem<any>): string {
    const dataIndex = context.dataIndex;
    const dataset = context.dataset;
    const value = dataset.data[dataIndex] as number;
    const label = String(context.chart.data.labels?.[dataIndex] ?? this.translateService.instant('stats.library.chart.common.unknown'));
    const total = (dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
    const percentage = ((value / total) * 100).toFixed(1);
    const countLabel = this.translateService.instant(
      value === 1 ? 'stats.library.units.bookCountOne' : 'stats.library.units.bookCountMany',
      {count: value}
    );
    return this.translateService.instant('stats.library.chart.languageDistribution.tooltipLabel', {
      label,
      countLabel,
      percentage
    });
  }

  private getDisplayLanguageName(languageId: string): string {
    if (languageId === UNKNOWN_LANGUAGE_ID) {
      return this.translateService.instant('stats.library.chart.common.unknown');
    }
    const labelKeyMap: Record<string, string> = {
      en: 'stats.library.chart.languages.english',
      es: 'stats.library.chart.languages.spanish',
      fr: 'stats.library.chart.languages.french',
      de: 'stats.library.chart.languages.german',
      it: 'stats.library.chart.languages.italian',
      pt: 'stats.library.chart.languages.portuguese',
      ru: 'stats.library.chart.languages.russian',
      ja: 'stats.library.chart.languages.japanese',
      zh: 'stats.library.chart.languages.chinese',
      ko: 'stats.library.chart.languages.korean',
      ar: 'stats.library.chart.languages.arabic'
    };
    const key = labelKeyMap[languageId];
    return key ? this.translateService.instant(key) : languageId;
  }

  private buildOptions(): ChartConfiguration<'doughnut'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            padding: 12,
            usePointStyle: true,
            generateLabels: this.generateLegendLabels.bind(this)
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#ffffff',
          borderWidth: 1,
          cornerRadius: 6,
          displayColors: true,
          padding: 12,
          titleFont: {size: 14, weight: 'bold'},
          bodyFont: {size: 12},
          position: 'nearest',
          callbacks: {
            title: (context) => String(context[0]?.label ?? ''),
            label: this.formatTooltipLabel.bind(this)
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'point'
      },
      cutout: '45%'
    };
  }
}
