import {Component, inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BaseChartDirective} from 'ng2-charts';
import {BehaviorSubject, EMPTY, Observable, Subject} from 'rxjs';
import {catchError, filter, first, takeUntil} from 'rxjs/operators';
import {ChartConfiguration, ChartData, Chart, TooltipItem} from 'chart.js';
import {BookService} from '../../../book/service/book.service';
import {Book, ReadStatus} from '../../../book/model/book.model';
import {BookState} from '../../../book/model/state/book-state.model';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

interface ReadingStatusStats {
  status: string;
  count: number;
  percentage: number;
}

const STATUS_COLOR_MAP: Record<string, string> = {
  'stats.user.readStatus.status.unread': '#6c757d',
  'stats.user.readStatus.status.currentlyReading': '#17a2b8',
  'stats.user.readStatus.status.rereading': '#6f42c1',
  'stats.user.readStatus.status.read': '#28a745',
  'stats.user.readStatus.status.partiallyRead': '#ffc107',
  'stats.user.readStatus.status.paused': '#fd7e14',
  'stats.user.readStatus.status.wontRead': '#dc3545',
  'stats.user.readStatus.status.abandoned': '#e74c3c',
  'stats.user.readStatus.status.noStatus': '#343a40'
} as const;

const CHART_DEFAULTS = {
  borderColor: '#ffffff',
  borderWidth: 2,
  hoverBorderWidth: 3,
  hoverBorderColor: '#ffffff'
} as const;

type StatusChartData = ChartData<'doughnut', number[], string>;

@Component({
  selector: 'app-read-status-chart',
  standalone: true,
  imports: [CommonModule, TranslateModule, BaseChartDirective],
  templateUrl: './read-status-chart.component.html',
  styleUrls: ['./read-status-chart.component.scss']
})
export class ReadStatusChartComponent implements OnInit, OnDestroy {
  private readonly bookService = inject(BookService);
  private readonly translate = inject(TranslateService);
  private readonly destroy$ = new Subject<void>();
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  public readonly chartType = 'doughnut' as const;

  public readonly chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {top: 15}
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          padding: 15,
          usePointStyle: true,
          color: '#ffffff',
          font: {
            family: "'Inter', sans-serif",
            size: 12
          },
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
        bodyFont: {size: 13},
        callbacks: {
          title: (context) => this.translate.instant(String(context[0]?.label || 'stats.user.readStatus.status.unknown')),
          label: this.formatTooltipLabel.bind(this)
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'point'
    }
  };

  private readonly chartDataSubject = new BehaviorSubject<StatusChartData>({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [...Object.values(STATUS_COLOR_MAP)],
      ...CHART_DEFAULTS
    }]
  });

  public readonly chartData$: Observable<StatusChartData> = this.chartDataSubject.asObservable();

  ngOnInit(): void {
    this.bookService.bookState$
      .pipe(
        filter(state => state.loaded),
        first(),
        catchError((error) => {
          console.error('Error processing reading status stats:', error);
          return EMPTY;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const stats = this.calculateReadingStatusStats();
        this.updateChartData(stats);
      });

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.chart?.chart?.update();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateChartData(stats: ReadingStatusStats[]): void {
    try {
      const labels = stats.map(s => s.status);
      const dataValues = stats.map(s => s.count);
      const colors = stats.map(s => STATUS_COLOR_MAP[s.status] || '#6c757d');

      this.chartDataSubject.next({
        labels,
        datasets: [{
          data: dataValues,
          backgroundColor: colors,
          ...CHART_DEFAULTS
        }]
      });
    } catch (error) {
      console.error('Error updating chart data:', error);
    }
  }

  private calculateReadingStatusStats(): ReadingStatusStats[] {
    const currentState = this.bookService.getCurrentBookState();

    if (!this.isValidBookState(currentState)) {
      return [];
    }

    return this.processReadingStatusStats(currentState.books!);
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

  private processReadingStatusStats(books: Book[]): ReadingStatusStats[] {
    if (books.length === 0) {
      return [];
    }

    const statusMap = this.buildStatusMap(books);
    return this.convertMapToStats(statusMap, books.length);
  }

  private buildStatusMap(books: Book[]): Map<ReadStatus, number> {
    const statusMap = new Map<ReadStatus, number>();

    for (const book of books) {
      const rawStatus = book.readStatus;
      const status: ReadStatus = Object.values(ReadStatus).includes(rawStatus as ReadStatus)
        ? (rawStatus as ReadStatus)
        : ReadStatus.UNSET;

      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    }

    return statusMap;
  }

  private convertMapToStats(statusMap: Map<ReadStatus, number>, totalBooks: number): ReadingStatusStats[] {
    return Array.from(statusMap.entries())
      .map(([status, count]) => ({
        status: this.formatReadStatus(status),
        count,
        percentage: Number(((count / totalBooks) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);
  }

  private formatReadStatus(status: ReadStatus | null | undefined): string {
    const STATUS_MAPPING: Record<string, string> = {
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

    if (!status) return 'stats.user.readStatus.status.noStatus';
    return STATUS_MAPPING[status] ?? 'stats.user.readStatus.status.noStatus';
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

      const labelKey = String(label);
      const labelText = this.translate.instant(labelKey);

      return {
        text: `${labelText} (${dataValues[index]})`,
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
    const labelKey = String(context.chart.data.labels?.[dataIndex] || 'stats.user.readStatus.status.unknown');
    const label = this.translate.instant(labelKey);
    const total = (dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
    const percentage = ((value / total) * 100).toFixed(1);
    const count = value === 1
      ? this.translate.instant('stats.user.units.bookCountOne', {count: value})
      : this.translate.instant('stats.user.units.bookCountMany', {count: value});
    return this.translate.instant('stats.user.readStatus.tooltip.label', {status: label, count, percentage});
  }
}
