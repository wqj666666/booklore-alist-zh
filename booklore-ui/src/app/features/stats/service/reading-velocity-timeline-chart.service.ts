import {inject, Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, combineLatest, EMPTY, Observable, Subject} from 'rxjs';
import {takeUntil, catchError, filter, first, switchMap} from 'rxjs/operators';
import {ChartConfiguration, ChartData, TooltipItem} from 'chart.js';

import {LibraryFilterService} from './library-filter.service';
import {BookService} from '../../book/service/book.service';
import {Book, ReadStatus} from '../../book/model/book.model';
import {BookState} from '../../book/model/state/book-state.model';
import {TranslateService} from '@ngx-translate/core';
import {LanguageService} from '../../../core/i18n/language.service';

interface VelocityTimelineData {
  month: string;
  booksCompleted: number;
  totalPages: number;
  averagePages: number;
  averageRating: number;
  avgPagesPerDay: number;
  readingVelocity: number; // Books per month
}

const CHART_COLORS = {
  booksCompleted: '#3498db',
  avgPagesPerDay: '#e74c3c',
  averageRating: '#f39c12',
  readingVelocity: '#2ecc71'
} as const;

type VelocityTimelineChartData = ChartData<'line', number[], string>;

type VelocityMetric = 'booksCompleted' | 'avgPagesPerDay' | 'avgRatingScaled' | 'readingVelocity';

@Injectable({
  providedIn: 'root'
})
export class ReadingVelocityTimelineChartService implements OnDestroy {
  private readonly bookService = inject(BookService);
  private readonly libraryFilterService = inject(LibraryFilterService);
  private readonly translateService = inject(TranslateService);
  private readonly languageService = inject(LanguageService);
  private readonly destroy$ = new Subject<void>();

  public readonly velocityTimelineChartType = 'line' as const;

  public velocityTimelineChartOptions: ChartConfiguration<'line'>['options'] = this.buildOptions();

  private readonly velocityTimelineChartDataSubject = new BehaviorSubject<VelocityTimelineChartData>({
    labels: [],
    datasets: []
  });

  public readonly velocityTimelineChartData$: Observable<VelocityTimelineChartData> = this.velocityTimelineChartDataSubject.asObservable();

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
          console.error('Error processing velocity timeline stats:', error);
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.velocityTimelineChartOptions = this.buildOptions();
        const stats = this.calculateVelocityTimelineStats();
        this.updateChartData(stats);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateChartData(stats: VelocityTimelineData[]): void {
    try {
      this.lastCalculatedStats = stats;
      const labels = stats.map(s => s.month);

      const datasets = [
        {
          label: this.translateService.instant('stats.library.chart.readingVelocityTimeline.datasets.booksCompleted'),
          metric: 'booksCompleted' as VelocityMetric,
          data: stats.map(s => s.booksCompleted),
          borderColor: CHART_COLORS.booksCompleted,
          backgroundColor: CHART_COLORS.booksCompleted + '20',
          yAxisID: 'y',
          tension: 0.2,
          fill: false
        },
        {
          label: this.translateService.instant('stats.library.chart.readingVelocityTimeline.datasets.avgPagesPerDay'),
          metric: 'avgPagesPerDay' as VelocityMetric,
          data: stats.map(s => s.avgPagesPerDay),
          borderColor: CHART_COLORS.avgPagesPerDay,
          backgroundColor: CHART_COLORS.avgPagesPerDay + '20',
          yAxisID: 'y1',
          tension: 0.2,
          fill: false
        },
        {
          label: this.translateService.instant('stats.library.chart.readingVelocityTimeline.datasets.avgRatingScaled'),
          metric: 'avgRatingScaled' as VelocityMetric,
          data: stats.map(s => s.averageRating * 2), // Scale for visibility
          borderColor: CHART_COLORS.averageRating,
          backgroundColor: CHART_COLORS.averageRating + '20',
          yAxisID: 'y',
          tension: 0.2,
          fill: false,
          borderDash: [5, 5]
        },
        {
          label: this.translateService.instant('stats.library.chart.readingVelocityTimeline.datasets.readingVelocity'),
          metric: 'readingVelocity' as VelocityMetric,
          data: stats.map(s => s.readingVelocity),
          borderColor: CHART_COLORS.readingVelocity,
          backgroundColor: CHART_COLORS.readingVelocity + '20',
          yAxisID: 'y',
          tension: 0.2,
          fill: true,
          fillOpacity: 0.1
        }
      ];

      this.velocityTimelineChartDataSubject.next({
        labels,
        datasets
      });
    } catch (error) {
      console.error('Error updating velocity timeline chart data:', error);
    }
  }

  private calculateVelocityTimelineStats(): VelocityTimelineData[] {
    const currentState = this.bookService.getCurrentBookState();
    const selectedLibraryId = this.libraryFilterService.getCurrentSelectedLibrary();

    if (!this.isValidBookState(currentState)) {
      return [];
    }

    const filteredBooks = this.filterBooksByLibrary(currentState.books!, String(selectedLibraryId));
    return this.processVelocityTimelineStats(filteredBooks);
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

  private processVelocityTimelineStats(books: Book[]): VelocityTimelineData[] {
    if (books.length === 0) {
      return [];
    }

    // Filter completed books with finish dates
    const completedBooks = books.filter(book =>
      book.readStatus === ReadStatus.READ &&
      book.dateFinished
    );

    if (completedBooks.length === 0) {
      return [];
    }

    // Group books by month-year
    const monthlyData = new Map<string, Book[]>();

    for (const book of completedBooks) {
      const finishDate = new Date(book.dateFinished!);
      if (isNaN(finishDate.getTime())) continue;

      const monthKey = this.formatMonthYear(finishDate);
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, []);
      }
      monthlyData.get(monthKey)!.push(book);
    }

    // Convert to timeline data and sort chronologically
    const timelineData = Array.from(monthlyData.entries())
      .map(([monthKey, monthBooks]) => this.calculateMonthlyMetrics(monthKey, monthBooks))
      .sort((a, b) => new Date(a.month + '-01').getTime() - new Date(b.month + '-01').getTime())
      .slice(-24); // Last 24 months

    return timelineData;
  }

  private formatMonthYear(date: Date): string {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }

  private calculateMonthlyMetrics(monthKey: string, books: Book[]): VelocityTimelineData {
    const totalPages = books.reduce((sum, book) => sum + (book.metadata?.pageCount || 0), 0);
    const averagePages = books.length > 0 ? Math.round(totalPages / books.length) : 0;

    // Calculate average rating
    const ratedBooks = books.filter(book => book.personalRating || book.metadata?.goodreadsRating);
    const totalRating = ratedBooks.reduce((sum, book) => {
      const rating = book.personalRating || book.metadata?.goodreadsRating || 0;
      return sum + rating;
    }, 0);
    const averageRating = ratedBooks.length > 0 ? Number((totalRating / ratedBooks.length).toFixed(1)) : 0;

    // Calculate days in month for pages per day calculation
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const avgPagesPerDay = Math.round(totalPages / daysInMonth);

    // Reading velocity is books per month
    const readingVelocity = books.length;

    return {
      month: this.formatDisplayMonth(monthKey),
      booksCompleted: books.length,
      totalPages,
      averagePages,
      averageRating,
      avgPagesPerDay,
      readingVelocity
    };
  }

  private formatDisplayMonth(monthKey: string): string {
    const [yearStr, monthStr] = monthKey.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!year || !month) return monthKey;

    const locale = this.translateService.currentLang === 'zh-CN' ? 'zh-CN' : 'en-US';
    const date = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat(locale, {month: 'short', year: 'numeric'}).format(date);
  }

  private formatTooltipLabel(context: TooltipItem<'line'>): string {
    const metric = (context.dataset as any).metric as VelocityMetric | undefined;
    const value = context.parsed.y;
    const dataIndex = context.dataIndex;
    const stats = this.getLastCalculatedStats();

    if (!stats || dataIndex >= stats.length) {
      return String(value ?? '');
    }

    const monthStats = stats[dataIndex];
    const countLabel = this.translateService.instant(
      monthStats.booksCompleted === 1 ? 'stats.library.units.bookCountOne' : 'stats.library.units.bookCountMany',
      {count: monthStats.booksCompleted}
    );

    switch (metric) {
      case 'booksCompleted': {
        return this.translateService.instant('stats.library.chart.readingVelocityTimeline.tooltips.booksCompleted', {
          value,
          totalPages: monthStats.totalPages,
          countLabel
        });
      }
      case 'avgPagesPerDay': {
        return this.translateService.instant('stats.library.chart.readingVelocityTimeline.tooltips.avgPagesPerDay', {
          value,
          averagePages: monthStats.averagePages
        });
      }
      case 'avgRatingScaled': {
        const actualRating = (value ?? 0) / 2;
        return this.translateService.instant('stats.library.chart.readingVelocityTimeline.tooltips.avgRating', {
          rating: actualRating.toFixed(1),
          countLabel
        });
      }
      case 'readingVelocity': {
        return this.translateService.instant('stats.library.chart.readingVelocityTimeline.tooltips.readingVelocity', {
          value,
          avgPagesPerDay: monthStats.avgPagesPerDay
        });
      }
      default: {
        return String(value ?? '');
      }
    }
  }

  private lastCalculatedStats: VelocityTimelineData[] = [];

  private getLastCalculatedStats(): VelocityTimelineData[] {
    return this.lastCalculatedStats;
  }

  private buildOptions(): ChartConfiguration<'line'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'category',
          ticks: {
            color: '#ffffff',
            font: {
              family: "'Inter', sans-serif",
              size: 11
            },
            maxRotation: 45
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          title: {
            display: true,
            text: this.translateService.instant('stats.library.chart.readingVelocityTimeline.axis.xTitle'),
            color: '#ffffff',
            font: {
              family: "'Inter', sans-serif",
              size: 11.5
            }
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          ticks: {
            color: '#ffffff',
            font: {
              family: "'Inter', sans-serif",
              size: 11
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          title: {
            display: true,
            text: this.translateService.instant('stats.library.chart.readingVelocityTimeline.axis.yTitle'),
            color: '#ffffff',
            font: {
              family: "'Inter', sans-serif",
              size: 11.5
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          ticks: {
            color: '#ffffff',
            font: {
              family: "'Inter', sans-serif",
              size: 11
            }
          },
          grid: {
            drawOnChartArea: false
          },
          title: {
            display: true,
            text: this.translateService.instant('stats.library.chart.readingVelocityTimeline.axis.y1Title'),
            color: '#ffffff',
            font: {
              family: "'Inter', sans-serif",
              size: 11.5
            }
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
              size: 11.5
            },
            padding: 15,
            usePointStyle: true
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
            title: (context) => String(context[0]?.label ?? ''),
            label: this.formatTooltipLabel.bind(this)
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      elements: {
        point: {
          radius: 4,
          hoverRadius: 6
        },
        line: {
          tension: 0.2,
          borderWidth: 2
        }
      }
    };
  }
}
