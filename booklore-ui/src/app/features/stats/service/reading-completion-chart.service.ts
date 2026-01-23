import {inject, Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, combineLatest, EMPTY, Observable, Subject} from 'rxjs';
import {catchError, filter, first, map, switchMap, takeUntil} from 'rxjs/operators';
import {LibraryFilterService} from './library-filter.service';
import {BookService} from '../../book/service/book.service';
import {Book, ReadStatus} from '../../book/model/book.model';
import {BookState} from '../../book/model/state/book-state.model';
import {ChartConfiguration, ChartData, TooltipItem} from 'chart.js';
import {TranslateService} from '@ngx-translate/core';
import {LanguageService} from '../../../core/i18n/language.service';

interface CompletionStats {
  category: string;
  readStatusCounts: Record<ReadStatus, number>;
  total: number;
}

const READ_STATUS_COLORS: Record<ReadStatus, string> = {
  [ReadStatus.READ]: '#2ecc71',
  [ReadStatus.READING]: '#f39c12',
  [ReadStatus.RE_READING]: '#9b59b6',
  [ReadStatus.PARTIALLY_READ]: '#e67e22',
  [ReadStatus.PAUSED]: '#34495e',
  [ReadStatus.UNREAD]: '#4169e1',
  [ReadStatus.WONT_READ]: '#95a5a6',
  [ReadStatus.ABANDONED]: '#e74c3c',
  [ReadStatus.UNSET]: '#3498db'
};

const CHART_DEFAULTS = {
  borderColor: '#ffffff',
  hoverBorderWidth: 1,
  hoverBorderColor: '#ffffff'
} as const;

type CompletionChartData = ChartData<'bar', number[], string>;

@Injectable({
  providedIn: 'root'
})
export class ReadingCompletionChartService implements OnDestroy {
  private readonly bookService = inject(BookService);
  private readonly libraryFilterService = inject(LibraryFilterService);
  private readonly translateService = inject(TranslateService);
  private readonly languageService = inject(LanguageService);
  private readonly destroy$ = new Subject<void>();

  public readonly completionChartType = 'bar' as const;

  public completionChartOptions: ChartConfiguration<'bar'>['options'] = this.buildOptions();

  private readonly completionChartDataSubject = new BehaviorSubject<CompletionChartData>({
    labels: [],
    datasets: Object.values(ReadStatus).map(status => ({
      label: this.formatReadStatusLabel(status),
      readStatus: status,
      data: [],
      backgroundColor: READ_STATUS_COLORS[status],
      ...CHART_DEFAULTS
    })) as any
  });

  public readonly completionChartData$: Observable<CompletionChartData> =
    this.completionChartDataSubject.asObservable();

  private lastCalculatedStats: CompletionStats[] = [];

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
          console.error('Error processing completion stats:', error);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.completionChartOptions = this.buildOptions();
        const stats = this.calculateCompletionStats();
        this.updateChartData(stats);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateChartData(stats: CompletionStats[]): void {
    try {
      this.lastCalculatedStats = stats;
      const topCategories = stats
        .sort((a, b) => b.total - a.total)
        .slice(0, 25);

      const labels = topCategories.map(s => {
        return s.category.length > 20
          ? s.category.substring(0, 15) + '..'
          : s.category;
      });

      const datasets = Object.values(ReadStatus).map(status => ({
        label: this.formatReadStatusLabel(status),
        readStatus: status,
        data: topCategories.map(s => s.readStatusCounts[status] || 0),
        backgroundColor: READ_STATUS_COLORS[status],
        ...CHART_DEFAULTS
      })) as any;

      this.completionChartDataSubject.next({
        labels,
        datasets
      });
    } catch (error) {
      console.error('Error updating completion chart data:', error);
    }
  }

  private calculateCompletionStats(): CompletionStats[] {
    const currentState = this.bookService.getCurrentBookState();
    const selectedLibraryId = this.libraryFilterService.getCurrentSelectedLibrary();

    if (!this.isValidBookState(currentState)) {
      return [];
    }

    const filteredBooks = this.filterBooksByLibrary(currentState.books!, selectedLibraryId);
    return this.processCompletionStats(filteredBooks);
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

  private filterBooksByLibrary(books: Book[], selectedLibraryId: string | number | null): Book[] {
    return selectedLibraryId
      ? books.filter(book => book.libraryId === selectedLibraryId)
      : books;
  }

  private processCompletionStats(books: Book[]): CompletionStats[] {
    const categoryMap = new Map<string, {
      readStatusCounts: Record<ReadStatus, number>;
    }>();

    books.forEach(book => {
      const categories = book.metadata?.categories || [this.translateService.instant('stats.library.chart.common.uncategorized')];

      categories.forEach(category => {
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            readStatusCounts: Object.values(ReadStatus).reduce((acc, status) => {
              acc[status] = 0;
              return acc;
            }, {} as Record<ReadStatus, number>)
          });
        }

        const stats = categoryMap.get(category)!;
        const rawStatus = book.readStatus;
        const readStatus: ReadStatus = Object.values(ReadStatus).includes(rawStatus as ReadStatus)
          ? (rawStatus as ReadStatus)
          : ReadStatus.UNSET;
        stats.readStatusCounts[readStatus]++;
      });
    });

    return Array.from(categoryMap.entries()).map(([category, stats]) => {
      const total = Object.values(stats.readStatusCounts).reduce((sum, count) => sum + count, 0);
      return {
        category,
        readStatusCounts: stats.readStatusCounts,
        total
      };
    }).filter(stat => stat.total > 0);
  }

  private formatReadStatusLabel(status: ReadStatus): string {
    const statusKeyMapping: Record<ReadStatus, string> = {
      [ReadStatus.UNREAD]: 'stats.user.readStatus.status.unread',
      [ReadStatus.READING]: 'stats.user.readStatus.status.currentlyReading',
      [ReadStatus.RE_READING]: 'stats.user.readStatus.status.rereading',
      [ReadStatus.READ]: 'stats.user.readStatus.status.read',
      [ReadStatus.PARTIALLY_READ]: 'stats.user.readStatus.status.partiallyRead',
      [ReadStatus.PAUSED]: 'stats.user.readStatus.status.paused',
      [ReadStatus.WONT_READ]: 'stats.user.readStatus.status.wontRead',
      [ReadStatus.ABANDONED]: 'stats.user.readStatus.status.abandoned',
      [ReadStatus.UNSET]: 'stats.user.readStatus.status.noStatus'
    };
    return this.translateService.instant(statusKeyMapping[status] || 'stats.user.readStatus.status.unknown');
  }

  private formatTooltipLabel(context: TooltipItem<'bar'>): string {
    const dataIndex = context.dataIndex;
    const stats = this.getLastCalculatedStats();

    if (!stats || dataIndex >= stats.length) {
      return this.translateService.instant(
        context.parsed.y === 1 ? 'stats.library.units.bookCountOne' : 'stats.library.units.bookCountMany',
        {count: context.parsed.y}
      );
    }

    const value = context.parsed.y;
    const datasetLabel = String(context.dataset.label ?? '');
    const countLabel = this.translateService.instant(
      value === 1 ? 'stats.library.units.bookCountOne' : 'stats.library.units.bookCountMany',
      {count: value}
    );
    return this.translateService.instant('stats.library.chart.topCategories.tooltipLabel', {
      status: datasetLabel,
      countLabel
    });
  }

  private buildOptions(): ChartConfiguration<'bar'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: '#ffffff',
            font: {size: 10},
            maxRotation: 45,
            minRotation: 0
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          title: {
            display: true,
            text: this.translateService.instant('stats.library.chart.topCategories.axis.xTitle'),
            color: '#ffffff',
            font: {
              family: "'Inter', sans-serif",
              size: 11
            },
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            color: '#ffffff',
            font: {
              family: "'Inter', sans-serif",
              size: 11
            },
            stepSize: 1,
            maxTicksLimit: 25
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          title: {
            display: true,
            text: this.translateService.instant('stats.library.chart.common.axis.numberOfBooks'),
            color: '#ffffff',
            font: {
              family: "'Inter', sans-serif",
              size: 11.5
            },
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#ffffff',
            font: {
              family: "'Inter', sans-serif",
              size: 10
            },
            padding: 15,
            boxWidth: 12
          }
        },
        tooltip: {
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
          callbacks: {
            title: (context) => {
              const dataIndex = context[0].dataIndex;
              const stats = this.getLastCalculatedStats();
              return stats[dataIndex]?.category || this.translateService.instant('stats.library.chart.common.unknownCategory');
            },
            label: this.formatTooltipLabel.bind(this)
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    };
  }

  private getLastCalculatedStats(): CompletionStats[] {
    return this.lastCalculatedStats;
  }
}
