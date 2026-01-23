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

interface QualityScoreStats {
  categoryId: QualityCategoryId;
  categoryLabel: string;
  count: number;
  averageScore: number;
  scoreRange: string;
}

const CHART_DEFAULTS = {
  borderColor: '#ffffff',
  borderWidth: 2,
  hoverBorderWidth: 3,
  hoverBorderColor: '#ffffff'
} as const;

type QualityCategoryId = 'excellent' | 'veryGood' | 'good' | 'average' | 'poor' | 'veryPoor';

const QUALITY_CATEGORIES: Array<{
  id: QualityCategoryId;
  minScoreInclusive: number;
  labelKey: string;
  color: string;
  scoreRange: string;
}> = [
  {id: 'excellent', minScoreInclusive: 9, labelKey: 'stats.library.chart.bookMetadataScore.categories.excellent', color: '#2ecc71', scoreRange: '90-100%'},
  {id: 'veryGood', minScoreInclusive: 8, labelKey: 'stats.library.chart.bookMetadataScore.categories.veryGood', color: '#27ae60', scoreRange: '80-89%'},
  {id: 'good', minScoreInclusive: 6, labelKey: 'stats.library.chart.bookMetadataScore.categories.good', color: '#3498db', scoreRange: '60-79%'},
  {id: 'average', minScoreInclusive: 4, labelKey: 'stats.library.chart.bookMetadataScore.categories.average', color: '#f39c12', scoreRange: '40-59%'},
  {id: 'poor', minScoreInclusive: 2, labelKey: 'stats.library.chart.bookMetadataScore.categories.poor', color: '#e67e22', scoreRange: '20-39%'},
  {id: 'veryPoor', minScoreInclusive: 0, labelKey: 'stats.library.chart.bookMetadataScore.categories.veryPoor', color: '#e74c3c', scoreRange: '0-19%'}
] as const;

type QualityChartData = ChartData<'doughnut', number[], string>;

@Injectable({
  providedIn: 'root'
})
export class BookQualityScoreChartService implements OnDestroy {
  private readonly bookService = inject(BookService);
  private readonly libraryFilterService = inject(LibraryFilterService);
  private readonly translateService = inject(TranslateService);
  private readonly languageService = inject(LanguageService);
  private readonly destroy$ = new Subject<void>();

  public readonly qualityChartType = 'doughnut' as const;

  public qualityChartOptions: ChartConfiguration<'doughnut'>['options'] = this.buildOptions();

  private readonly qualityChartDataSubject = new BehaviorSubject<QualityChartData>({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: QUALITY_CATEGORIES.map(c => c.color),
      ...CHART_DEFAULTS
    }]
  });

  public readonly qualityChartData$: Observable<QualityChartData> = this.qualityChartDataSubject.asObservable();

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
          console.error('Error processing quality score stats:', error);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.qualityChartOptions = this.buildOptions();
        const stats = this.calculateQualityScoreStats();
        this.updateChartData(stats);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateChartData(stats: QualityScoreStats[]): void {
    try {
      this.lastCalculatedStats = stats;
      const labels = stats.map(s => s.categoryLabel);
      const dataValues = stats.map(s => s.count);
      const colors = this.getColorsForQualityData(stats);

      this.qualityChartDataSubject.next({
        labels,
        datasets: [{
          data: dataValues,
          backgroundColor: colors,
          ...CHART_DEFAULTS
        }]
      });
    } catch (error) {
      console.error('Error updating quality chart data:', error);
    }
  }

  private getColorsForQualityData(stats: QualityScoreStats[]): string[] {
    const colorsById = QUALITY_CATEGORIES.reduce((acc, c) => {
      acc[c.id] = c.color;
      return acc;
    }, {} as Record<QualityCategoryId, string>);
    return stats.map(stat => colorsById[stat.categoryId] || '#34495e');
  }

  private calculateQualityScoreStats(): QualityScoreStats[] {
    const currentState = this.bookService.getCurrentBookState();
    const selectedLibraryId = this.libraryFilterService.getCurrentSelectedLibrary();

    if (!this.isValidBookState(currentState)) {
      return [];
    }

    const filteredBooks = this.filterBooksByLibrary(currentState.books!, String(selectedLibraryId));
    return this.processQualityScoreStats(filteredBooks);
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

  private processQualityScoreStats(books: Book[]): QualityScoreStats[] {
    if (books.length === 0) {
      return [];
    }

    const qualityCategories = this.categorizeByQualityScore(books);
    return this.convertToQualityStats(qualityCategories);
  }

  private categorizeByQualityScore(books: Book[]): Map<QualityCategoryId, { books: Book[], scores: number[] }> {
    const categories = new Map<QualityCategoryId, { books: Book[], scores: number[] }>();
    for (const category of QUALITY_CATEGORIES) {
      categories.set(category.id, {books: [], scores: []});
    }

    for (const book of books) {
      const qualityScore = this.calculateQualityScore(book);
      const categoryId = this.getQualityCategoryId(qualityScore);
      categories.get(categoryId)!.books.push(book);
      categories.get(categoryId)!.scores.push(qualityScore);
    }

    return categories;
  }

  private calculateQualityScore(book: Book): number {
    // Use metadataMatchScore directly, scale from 0-100 to 0-10
    if (book.metadataMatchScore !== null && book.metadataMatchScore !== undefined) {
      return Math.min(10, Math.max(0, book.metadataMatchScore / 10));
    }
    return 0;
  }

  private getQualityCategoryId(score: number): QualityCategoryId {
    for (const category of QUALITY_CATEGORIES) {
      if (score >= category.minScoreInclusive) {
        return category.id;
      }
    }
    return 'veryPoor';
  }

  private convertToQualityStats(categoriesMap: Map<QualityCategoryId, { books: Book[], scores: number[] }>): QualityScoreStats[] {
    const categoriesById = QUALITY_CATEGORIES.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {} as Record<QualityCategoryId, (typeof QUALITY_CATEGORIES)[number]>);

    return Array.from(categoriesMap.entries())
      .filter(([_, data]) => data.books.length > 0)
      .map(([categoryId, data]) => {
        const averageScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
        const category = categoriesById[categoryId];
        return {
          categoryId,
          categoryLabel: this.translateService.instant(category.labelKey),
          count: data.books.length,
          averageScore: Number(averageScore.toFixed(1)),
          scoreRange: category.scoreRange
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore);
  }

  private generateLegendLabels(chart: Chart) {
    const data = chart.data;
    if (!data.labels?.length || !data.datasets?.[0]?.data?.length) {
      return [];
    }

    const dataset = data.datasets[0];

    return data.labels.map((label: unknown, index: number) => {
      const isVisible = typeof chart.getDataVisibility === 'function'
        ? chart.getDataVisibility(index)
        : !((chart.getDatasetMeta && (chart.getDatasetMeta(0)?.data?.[index] as any)?.hidden) || false);

      return {
        text: String(label),
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
    const qualityStats = this.getLastCalculatedStats();

    if (!qualityStats || dataIndex >= qualityStats.length) {
      const count = Number(context.parsed) || 0;
      return this.translateService.instant(
        count === 1 ? 'stats.library.units.bookCountOne' : 'stats.library.units.bookCountMany',
        {count}
      );
    }

    const stats = qualityStats[dataIndex];
    // Defensive: filter to numbers only, avoid division by zero
    const dataArr = (context.chart.data.datasets[0].data as (number | null | undefined)[]).filter((v): v is number => typeof v === 'number');
    const total = dataArr.reduce((a, b) => a + b, 0);
    const percentage = total > 0 ? ((stats.count / total) * 100).toFixed(1) : '0.0';
    const countLabel = this.translateService.instant(
      stats.count === 1 ? 'stats.library.units.bookCountOne' : 'stats.library.units.bookCountMany',
      {count: stats.count}
    );
    return this.translateService.instant('stats.library.chart.bookMetadataScore.tooltipLabel', {
      countLabel,
      percentage,
      averageScore: stats.averageScore.toFixed(1),
      scoreRange: stats.scoreRange
    });
  }

  private lastCalculatedStats: QualityScoreStats[] = [];

  private getLastCalculatedStats(): QualityScoreStats[] {
    return this.lastCalculatedStats;
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
