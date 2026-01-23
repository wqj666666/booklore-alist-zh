import {Component, inject, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BaseChartDirective} from 'ng2-charts';
import {ChartConfiguration, ChartData} from 'chart.js';
import {BehaviorSubject, EMPTY, Observable, Subject} from 'rxjs';
import {catchError, takeUntil} from 'rxjs/operators';
import {GenreStatsResponse, UserStatsService} from '../../../settings/user-management/user-stats.service';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

type GenreChartData = ChartData<'bar', number[], string>;

@Component({
  selector: 'app-genre-stats-chart',
  standalone: true,
  imports: [CommonModule, TranslateModule, BaseChartDirective],
  templateUrl: './genre-stats-chart.component.html',
  styleUrls: ['./genre-stats-chart.component.scss']
})
export class GenreStatsChartComponent implements OnInit, OnDestroy {
  @Input() maxGenres: number = 35;
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  public readonly chartType = 'bar' as const;
  public readonly chartData$: Observable<GenreChartData>;
  public readonly chartOptions: ChartConfiguration['options'];

  private readonly userStatsService = inject(UserStatsService);
  private readonly translate = inject(TranslateService);
  private readonly destroy$ = new Subject<void>();
  private readonly chartDataSubject: BehaviorSubject<GenreChartData>;

  constructor() {
    this.chartDataSubject = new BehaviorSubject<GenreChartData>({
      labels: [],
      datasets: []
    });
    this.chartData$ = this.chartDataSubject.asObservable();

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {top: 10}
      },
      plugins: {
        legend: {display: false},
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
              const dataIndex = context.dataIndex;
              const dataset = context.dataset;
              const label = context.chart.data.labels?.[dataIndex] as string;
              const timeStr = this.formatDurationCompact(dataset.data[dataIndex] as number);
              return this.translate.instant('stats.user.genre.tooltip.label', {genre: label, time: timeStr});
            }
          }
        },
        datalabels: {display: false}
      },
      scales: {
        x: {
          title: {
            display: true,
            text: this.translate.instant('stats.user.genre.axis.genres'),
            color: '#ffffff',
            font: {
              family: "'Inter', sans-serif",
              size: 12
            }
          },
          ticks: {
            color: '#ffffff',
            font: {family: "'Inter', sans-serif", size: 11},
            maxRotation: 90,
            minRotation: 90,
            callback: (value, index) => {
              const label = this.chartDataSubject.value.labels?.[index] as string;
              const maxLength = 12;
              if (label && label.length > maxLength) {
                return label.substring(0, maxLength) + '...';
              }
              return label;
            }
          },
          grid: {display: false},
          border: {display: false}
        },
        y: {
          title: {
            display: true,
            text: this.translate.instant('stats.user.genre.axis.timeRead'),
            color: '#ffffff',
            font: {
              family: "'Inter', sans-serif",
              size: 12
            }
          },
          beginAtZero: true,
          ticks: {
            color: '#ffffff',
            font: {family: "'Inter', sans-serif", size: 11},
            callback: (value) => {
              const seconds = value as number;
              return this.formatDurationAxis(seconds);
            },
            stepSize: undefined,
            maxTicksLimit: 8
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          border: {display: false}
        }
      }
    };
  }

  ngOnInit(): void {
    this.loadGenreStats();

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const scales = this.chartOptions?.scales;
        if (scales?.['x'] && 'title' in scales['x']) {
          (scales['x'] as any).title.text = this.translate.instant('stats.user.genre.axis.genres');
        }
        if (scales?.['y'] && 'title' in scales['y']) {
          (scales['y'] as any).title.text = this.translate.instant('stats.user.genre.axis.timeRead');
        }

        const current = this.chartDataSubject.value;
        const dataset = current.datasets?.[0];
        this.chartDataSubject.next({
          ...current,
          datasets: dataset ? [{...dataset, label: this.translate.instant('stats.user.genre.datasetLabel')}] : []
        });
        this.chart?.chart?.update();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadGenreStats(): void {
    this.userStatsService.getGenreStats()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading genre stats:', error);
          return EMPTY;
        })
      )
      .subscribe((data) => {
        this.updateChartData(data);
      });
  }

  private updateChartData(genreStats: GenreStatsResponse[]): void {
    const sortedStats = [...genreStats]
      .sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds)
      .slice(0, this.maxGenres);

    const labels = sortedStats.map(stat => stat.genre);
    const durations = sortedStats.map(stat => stat.totalDurationSeconds);

    this.chartDataSubject.next({
      labels,
      datasets: [
        {
          label: this.translate.instant('stats.user.genre.datasetLabel'),
          data: durations,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.6
        }
      ]
    });
  }

  private formatDurationCompact(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    const hourUnit = this.translate.instant('stats.user.units.hourShort');
    const minuteUnit = this.translate.instant('stats.user.units.minuteShort');

    if (hours > 0) {
      return this.translate.instant('stats.user.genre.tooltip.timeHoursMinutes', {
        hours,
        hourUnit,
        minutes: mins,
        minuteUnit
      });
    }

    return this.translate.instant('stats.user.genre.tooltip.timeMinutes', {minutes: mins, minuteUnit});
  }

  private formatDurationAxis(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const dayUnit = this.translate.instant('stats.user.units.dayShort');
    const hourUnit = this.translate.instant('stats.user.units.hourShort');
    const minuteUnit = this.translate.instant('stats.user.units.minuteShort');
    const secondUnit = this.translate.instant('stats.user.units.secondShort');

    if (days > 0) {
      const remainingHours = hours % 24;
      return remainingHours > 0
        ? this.translate.instant('stats.user.genre.axis.daysHours', {days, dayUnit, hours: remainingHours, hourUnit})
        : this.translate.instant('stats.user.genre.axis.days', {days, dayUnit});
    }

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? this.translate.instant('stats.user.genre.axis.hoursMinutes', {hours, hourUnit, minutes: remainingMinutes, minuteUnit})
        : this.translate.instant('stats.user.genre.axis.hours', {hours, hourUnit});
    }

    if (minutes > 0) {
      return this.translate.instant('stats.user.genre.axis.minutes', {minutes, minuteUnit});
    }

    return this.translate.instant('stats.user.genre.axis.seconds', {seconds: totalSeconds, secondUnit});
  }
}
