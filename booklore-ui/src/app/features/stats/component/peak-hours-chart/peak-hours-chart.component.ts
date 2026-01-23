import {Component, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BaseChartDirective} from 'ng2-charts';
import {ChartConfiguration, ChartData} from 'chart.js';
import {BehaviorSubject, EMPTY, Observable, Subject} from 'rxjs';
import {catchError, takeUntil} from 'rxjs/operators';
import {PeakHoursResponse, UserStatsService} from '../../../settings/user-management/user-stats.service';
import {Select} from 'primeng/select';
import {FormsModule} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

type PeakHoursChartData = ChartData<'line', number[], string>;

@Component({
  selector: 'app-peak-hours-chart',
  standalone: true,
  imports: [CommonModule, TranslateModule, BaseChartDirective, Select, FormsModule],
  templateUrl: './peak-hours-chart.component.html',
  styleUrls: ['./peak-hours-chart.component.scss']
})
export class PeakHoursChartComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;
  public readonly chartType = 'line' as const;
  public readonly chartData$: Observable<PeakHoursChartData>;
  public readonly chartOptions: ChartConfiguration['options'];

  private readonly userStatsService = inject(UserStatsService);
  private readonly translate = inject(TranslateService);
  private readonly destroy$ = new Subject<void>();
  private readonly chartDataSubject: BehaviorSubject<PeakHoursChartData>;

  public selectedYear: number | null = null;
  public selectedMonth: number | null = null;
  public yearOptions: { label: string; value: number | null }[] = [];
  public monthOptions: { label: string; value: number | null }[] = [];

  constructor() {
    this.chartDataSubject = new BehaviorSubject<PeakHoursChartData>({
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
                return this.translate.instant('stats.user.peakHours.tooltip.sessions', {count: sessionCount});
              }

              const totalMinutes = Math.round(value);
              const hours = Math.floor(totalMinutes / 60);
              const minutes = totalMinutes % 60;
              const hourUnit = this.translate.instant('stats.user.units.hourShort');
              const minuteUnit = this.translate.instant('stats.user.units.minuteShort');
              return this.translate.instant('stats.user.peakHours.tooltip.duration', {hours, hourUnit, minutes, minuteUnit});
            }
          }
        },
        datalabels: {display: false}
      },
      scales: {
        x: {
          title: {
            display: true,
            text: this.translate.instant('stats.user.peakHours.axis.hourOfDay'),
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
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          border: {display: false}
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: this.translate.instant('stats.user.peakHours.axis.sessions'),
            color: 'rgba(34, 197, 94, 0.9)',
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
            text: this.translate.instant('stats.user.peakHours.axis.durationMinutes'),
            color: 'rgba(251, 191, 36, 0.9)',
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
              const minuteUnit = this.translate.instant('stats.user.units.minuteCompact');
              return (typeof value === 'number' ? Math.round(value) : 0) + minuteUnit;
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
    this.loadPeakHours();

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.rebuildFilterOptions();

        const scales = this.chartOptions?.scales;
        if (scales?.['x'] && 'title' in scales['x']) {
          (scales['x'] as any).title.text = this.translate.instant('stats.user.peakHours.axis.hourOfDay');
        }
        if (scales?.['y'] && 'title' in scales['y']) {
          (scales['y'] as any).title.text = this.translate.instant('stats.user.peakHours.axis.sessions');
        }
        if (scales?.['y1'] && 'title' in scales['y1']) {
          (scales['y1'] as any).title.text = this.translate.instant('stats.user.peakHours.axis.durationMinutes');
        }

        this.loadPeakHours();
        this.chart?.chart?.update();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private rebuildFilterOptions(): void {
    this.initializeYearOptions();
    this.initializeMonthOptions();
  }

  private initializeYearOptions(): void {
    const currentYear = new Date().getFullYear();
    this.yearOptions = [{label: this.translate.instant('stats.user.peakHours.filters.allYears'), value: null}];
    for (let year = currentYear; year >= currentYear - 10; year--) {
      this.yearOptions.push({ label: year.toString(), value: year });
    }
  }

  private initializeMonthOptions(): void {
    const locale = this.getLocale();
    this.monthOptions = [{label: this.translate.instant('stats.user.peakHours.filters.allMonths'), value: null}];
    for (let month = 1; month <= 12; month++) {
      const date = new Date(2024, month - 1, 1);
      this.monthOptions.push({label: date.toLocaleDateString(locale, {month: 'long'}), value: month});
    }
  }

  public onFilterChange(): void {
    this.loadPeakHours();
  }

  private loadPeakHours(): void {
    const year = this.selectedYear ?? undefined;
    const month = this.selectedMonth ?? undefined;

    this.userStatsService.getPeakHours(year, month)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading peak hours:', error);
          return EMPTY;
        })
      )
      .subscribe((data) => {
        this.updateChartData(data);
      });
  }

  private updateChartData(peakHours: PeakHoursResponse[]): void {
    const hourMap = new Map<number, PeakHoursResponse>();
    peakHours.forEach(item => {
      hourMap.set(item.hourOfDay, item);
    });

    const allHours = Array.from({length: 24}, (_, i) => i);
    const labels = allHours.map(h => this.formatHour(h));

    const sessionCounts = allHours.map(hour => {
      const hourData = hourMap.get(hour);
      return hourData?.sessionCount || 0;
    });

    const durations = allHours.map(hour => {
      const hourData = hourMap.get(hour);
      return hourData ? hourData.totalDurationSeconds / 60 : 0; // Convert to minutes
    });

    this.chartDataSubject.next({
      labels,
      datasets: [
        {
          label: this.translate.instant('stats.user.peakHours.dataset.sessions'),
          data: sessionCounts,
          borderColor: 'rgba(34, 197, 94, 0.9)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgba(34, 197, 94, 0.9)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          yAxisID: 'y'
        },
        {
          label: this.translate.instant('stats.user.peakHours.dataset.durationMinutes'),
          data: durations,
          borderColor: 'rgba(251, 191, 36, 0.9)',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgba(251, 191, 36, 0.9)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          yAxisID: 'y1'
        }
      ]
    });
  }

  private formatHour(hour: number): string {
    const date = new Date(2024, 0, 1, hour, 0, 0, 0);
    return date.toLocaleTimeString(this.getLocale(), {hour: 'numeric'});
  }

  private getLocale(): string {
    return this.translate.currentLang || this.translate.defaultLang || 'zh-CN';
  }
}
