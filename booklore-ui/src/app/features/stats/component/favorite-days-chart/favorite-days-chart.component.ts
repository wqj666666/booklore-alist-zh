import {Component, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BaseChartDirective} from 'ng2-charts';
import {ChartConfiguration, ChartData} from 'chart.js';
import {BehaviorSubject, EMPTY, Observable, Subject} from 'rxjs';
import {catchError, takeUntil} from 'rxjs/operators';
import {FavoriteDaysResponse, UserStatsService} from '../../../settings/user-management/user-stats.service';
import {Select} from 'primeng/select';
import {FormsModule} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

type FavoriteDaysChartData = ChartData<'bar', number[], string>;

@Component({
  selector: 'app-favorite-days-chart',
  standalone: true,
  imports: [CommonModule, TranslateModule, BaseChartDirective, Select, FormsModule],
  templateUrl: './favorite-days-chart.component.html',
  styleUrls: ['./favorite-days-chart.component.scss']
})
export class FavoriteDaysChartComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;
  public readonly chartType = 'bar' as const;
  public readonly chartData$: Observable<FavoriteDaysChartData>;
  public readonly chartOptions: ChartConfiguration['options'];

  private readonly userStatsService = inject(UserStatsService);
  private readonly translate = inject(TranslateService);
  private readonly destroy$ = new Subject<void>();
  private readonly chartDataSubject: BehaviorSubject<FavoriteDaysChartData>;

  private dayLabels: string[] = [];

  public selectedYear: number | null = null;
  public selectedMonth: number | null = null;
  public yearOptions: { label: string; value: number | null }[] = [];
  public monthOptions: { label: string; value: number | null }[] = [];

  constructor() {
    this.chartDataSubject = new BehaviorSubject<FavoriteDaysChartData>({
      labels: [],
      datasets: []
    });
    this.chartData$ = this.chartDataSubject.asObservable();

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {top: 10, bottom: 10, left: 10, right: 10}
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#ffffff',
            font: {family: "'Inter', sans-serif", size: 11},
            boxWidth: 12,
            padding: 10
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
          bodyFont: {size: 13},
          callbacks: {
            label: (context) => {
              const value = context.parsed.y;
              if (context.dataset.yAxisID === 'y') {
                const sessionCount = value === 1
                  ? this.translate.instant('stats.user.units.sessionCountOne', {count: value})
                  : this.translate.instant('stats.user.units.sessionCountMany', {count: value});
                return this.translate.instant('stats.user.favoriteDays.tooltip.sessions', {count: sessionCount});
              }

              const hours = Math.floor(value);
              const minutes = Math.round((value - hours) * 60);
              const hourUnit = this.translate.instant('stats.user.units.hourShort');
              const minuteUnit = this.translate.instant('stats.user.units.minuteShort');
              return this.translate.instant('stats.user.favoriteDays.tooltip.duration', {
                hours,
                hourUnit,
                minutes,
                minuteUnit
              });
            }
          }
        },
        datalabels: {display: false}
      },
      scales: {
        x: {
          title: {
            display: true,
            text: this.translate.instant('stats.user.favoriteDays.axis.dayOfWeek'),
            color: '#ffffff',
            font: {
              family: "'Inter', sans-serif",
              size: 13,
              weight: 'bold'
            }
          },
          ticks: {
            color: '#ffffff',
            font: {family: "'Inter', sans-serif", size: 11}
          },
          grid: {display: false},
          border: {display: false}
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: this.translate.instant('stats.user.favoriteDays.axis.sessions'),
            color: 'rgba(139, 92, 246, 1)',
            font: {
              family: "'Inter', sans-serif",
              size: 13,
              weight: 'bold'
            }
          },
          beginAtZero: true,
          ticks: {
            color: '#ffffff',
            font: {family: "'Inter', sans-serif", size: 11},
            stepSize: 1
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          border: {display: false}
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: this.translate.instant('stats.user.favoriteDays.axis.durationHours'),
            color: 'rgba(236, 72, 153, 1)',
            font: {
              family: "'Inter', sans-serif",
              size: 13,
              weight: 'bold'
            }
          },
          beginAtZero: true,
          ticks: {
            color: '#ffffff',
            font: {family: "'Inter', sans-serif", size: 11},
            callback: (value) => {
              const hourUnit = this.translate.instant('stats.user.units.hourCompact');
              return (typeof value === 'number' ? value.toFixed(1) : '0.0') + hourUnit;
            }
          },
          grid: {
            drawOnChartArea: false
          },
          border: {display: false}
        }
      }
    };
    this.rebuildFilterOptions();
  }

  ngOnInit(): void {
    this.loadFavoriteDays();

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.rebuildFilterOptions();

        const scales = this.chartOptions?.scales;
        if (scales?.['x'] && 'title' in scales['x']) {
          (scales['x'] as any).title.text = this.translate.instant('stats.user.favoriteDays.axis.dayOfWeek');
        }
        if (scales?.['y'] && 'title' in scales['y']) {
          (scales['y'] as any).title.text = this.translate.instant('stats.user.favoriteDays.axis.sessions');
        }
        if (scales?.['y1'] && 'title' in scales['y1']) {
          (scales['y1'] as any).title.text = this.translate.instant('stats.user.favoriteDays.axis.durationHours');
        }

        this.loadFavoriteDays();
        this.chart?.chart?.update();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private rebuildFilterOptions(): void {
    this.dayLabels = this.buildWeekdayLabels();
    this.initializeYearOptions();
    this.initializeMonthOptions();
  }

  private initializeYearOptions(): void {
    const currentYear = new Date().getFullYear();
    this.yearOptions = [{label: this.translate.instant('stats.user.favoriteDays.filters.allYears'), value: null}];
    for (let year = currentYear; year >= currentYear - 10; year--) {
      this.yearOptions.push({label: year.toString(), value: year});
    }
  }

  private initializeMonthOptions(): void {
    const locale = this.getLocale();
    this.monthOptions = [{label: this.translate.instant('stats.user.favoriteDays.filters.allMonths'), value: null}];
    for (let month = 1; month <= 12; month++) {
      const date = new Date(2024, month - 1, 1);
      this.monthOptions.push({label: date.toLocaleDateString(locale, {month: 'long'}), value: month});
    }
  }

  public onFilterChange(): void {
    this.loadFavoriteDays();
  }

  private loadFavoriteDays(): void {
    const year = this.selectedYear ?? undefined;
    const month = this.selectedMonth ?? undefined;

    this.userStatsService.getFavoriteDays(year, month)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading favorite days:', error);
          return EMPTY;
        })
      )
      .subscribe((data) => {
        this.updateChartData(data);
      });
  }

  private updateChartData(favoriteDays: FavoriteDaysResponse[]): void {
    const dayMap = new Map<number, FavoriteDaysResponse>();
    favoriteDays.forEach(item => {
      dayMap.set(item.dayOfWeek - 1, item);
    });

    const labels = this.dayLabels;
    const sessionCounts = this.dayLabels.map((_, index) => {
      const dayData = dayMap.get(index);
      return dayData?.sessionCount || 0;
    });

    const durations = this.dayLabels.map((_, index) => {
      const dayData = dayMap.get(index);
      return dayData ? dayData.totalDurationSeconds / 3600 : 0; // Convert to hours
    });

    this.chartDataSubject.next({
      labels,
      datasets: [
        {
          label: this.translate.instant('stats.user.favoriteDays.dataset.sessions'),
          data: sessionCounts,
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
          borderColor: 'rgba(139, 92, 246, 1)',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.6,
          yAxisID: 'y'
        },
        {
          label: this.translate.instant('stats.user.favoriteDays.dataset.durationHours'),
          data: durations,
          backgroundColor: 'rgba(236, 72, 153, 0.8)',
          borderColor: 'rgba(236, 72, 153, 1)',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.6,
          yAxisID: 'y1'
        }
      ]
    });
  }

  private buildWeekdayLabels(): string[] {
    const locale = this.getLocale();
    const formatter = new Intl.DateTimeFormat(locale, {weekday: 'long'});
    const sunday = new Date(2024, 0, 7);
    return Array.from({length: 7}, (_, i) => {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      return formatter.format(date);
    });
  }

  private getLocale(): string {
    return this.translate.currentLang || this.translate.defaultLang || 'zh-CN';
  }
}
