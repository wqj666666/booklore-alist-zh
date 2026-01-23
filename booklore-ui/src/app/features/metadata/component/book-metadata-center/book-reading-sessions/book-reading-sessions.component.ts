import {Component, inject, Input, OnInit, OnChanges, SimpleChanges} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReadingSessionApiService, ReadingSessionResponse} from '../../../../../shared/service/reading-session-api.service';
import {TableModule} from 'primeng/table';
import {ProgressSpinnerModule} from 'primeng/progressspinner';
import {TagModule} from 'primeng/tag';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-book-reading-sessions',
  standalone: true,
  imports: [CommonModule, TableModule, ProgressSpinnerModule, TagModule, TranslateModule],
  templateUrl: './book-reading-sessions.component.html',
  styleUrls: ['./book-reading-sessions.component.scss']
})
export class BookReadingSessionsComponent implements OnInit, OnChanges {
  @Input() bookId!: number;

  private readonly readingSessionService = inject(ReadingSessionApiService);
  private readonly translateService = inject(TranslateService);

  sessions: ReadingSessionResponse[] = [];
  totalRecords = 0;
  first = 0;
  rows = 5;
  loading = false;

  ngOnInit() {
    this.loadSessions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['bookId'] && !changes['bookId'].firstChange) {
      this.first = 0;
      this.loadSessions();
    }
  }

  loadSessions(page: number = 0) {
    this.loading = true;
    this.readingSessionService.getSessionsByBookId(this.bookId, page, this.rows)
      .subscribe({
        next: (response) => {
          this.sessions = response.content;
          this.totalRecords = response.totalElements;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  onPageChange(event: { first?: number; rows?: number | null }): void {
    if (event.first === undefined || event.rows === undefined || event.rows === null) return;
    this.first = event.first;
    const page = Math.floor(event.first / event.rows);
    this.loadSessions(page);
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const hourUnit = this.translateService.instant('metadata.readingSessions.unit.hour');
    const minuteUnit = this.translateService.instant('metadata.readingSessions.unit.minute');
    const secondUnit = this.translateService.instant('metadata.readingSessions.unit.second');

    if (hours > 0) {
      return `${hours}${hourUnit} ${minutes}${minuteUnit}`;
    } else if (minutes > 0) {
      return `${minutes}${minuteUnit} ${secs}${secondUnit}`;
    }
    return `${secs}${secondUnit}`;
  }

  formatDate(dateString: string): string {
    const locale = this.translateService.currentLang === 'zh-CN' ? 'zh-CN' : 'en-US';
    return new Date(dateString).toLocaleString(locale);
  }

  getProgressColor(delta: number): 'success' | 'secondary' | 'danger' {
    if (delta > 0) return 'success';
    if (delta < 0) return 'danger';
    return 'secondary';
  }

  isPageNumber(location: string | undefined): boolean {
    if (!location) return false;
    return !isNaN(Number(location)) && location.trim() !== '';
  }
}
