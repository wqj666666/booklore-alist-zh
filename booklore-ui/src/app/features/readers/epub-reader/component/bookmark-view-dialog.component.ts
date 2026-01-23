import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { BookMark } from '../../../../shared/service/book-mark.service';
import { PrimeTemplate } from 'primeng/api';
import {TranslateModule} from '@ngx-translate/core';

@Component({
  selector: 'app-bookmark-view-dialog',
  standalone: true,
  imports: [
    CommonModule,
    Dialog,
    Button,
    PrimeTemplate,
    TranslateModule
  ],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [style]="{width: '420px', maxWidth: '95vw'}"
      [draggable]="false"
      [resizable]="false"
      [closeOnEscape]="true"
      [appendTo]="'body'"
      [header]="'readers.epub.bookmarkViewDialog.title' | translate"
      (onHide)="onClose()">

      @if (bookmark) {
        <div class="bookmark-view-content">
          <div class="bookmark-view-header">
            <span class="bookmark-view-color" [style.background-color]="bookmark.color || 'var(--primary-color)'"></span>
            <h3 class="bookmark-view-title">{{ bookmark.title }}</h3>
          </div>

          <div class="bookmark-view-details">
            <div class="bookmark-view-row">
              <span class="bookmark-view-label">{{ 'readers.epub.bookmarkViewDialog.fields.created' | translate }}</span>
              <span class="bookmark-view-value">{{ bookmark.createdAt | date:'MMM d, y, h:mm a' }}</span>
            </div>
            <div class="bookmark-view-row">
              <span class="bookmark-view-label">{{ 'readers.epub.bookmarkViewDialog.fields.priority' | translate }}</span>
              <span class="bookmark-view-priority" [attr.data-priority]="bookmark.priority">
                {{ getPriorityLabelKey(bookmark.priority) | translate }}
              </span>
            </div>
          </div>

          <div class="bookmark-view-notes">
            <span class="bookmark-view-label">{{ 'readers.epub.bookmarkViewDialog.fields.notes' | translate }}</span>
            @if (bookmark.notes) {
              <p class="bookmark-view-notes-content">{{ bookmark.notes }}</p>
            } @else {
              <p class="bookmark-view-notes-empty">{{ 'readers.epub.bookmarkViewDialog.noNotes' | translate }}</p>
            }
          </div>
        </div>
      }

      <ng-template pTemplate="footer">
        <p-button
          [label]="'common.close' | translate"
          icon="pi pi-times"
          (click)="onClose()"
          [text]="true"
          severity="secondary">
        </p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .bookmark-view-content {
      padding: 0.5rem 0;
    }

    .bookmark-view-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .bookmark-view-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .bookmark-view-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-color);
      word-break: break-word;
    }

    .bookmark-view-details {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .bookmark-view-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .bookmark-view-label {
      font-size: 0.875rem;
      color: var(--text-color-secondary);
    }

    .bookmark-view-value {
      font-size: 0.875rem;
      color: var(--text-color);
    }

    .bookmark-view-priority {
      font-size: 0.8rem;
      font-weight: 500;
      padding: 0.25rem 0.625rem;
      border-radius: 1rem;
      background: color-mix(in srgb, var(--primary-color) 15%, transparent);
      color: var(--primary-color);
    }

    .bookmark-view-priority[data-priority="1"] {
      background: color-mix(in srgb, #ef4444 15%, transparent);
      color: #ef4444;
    }

    .bookmark-view-priority[data-priority="2"] {
      background: color-mix(in srgb, #f97316 15%, transparent);
      color: #f97316;
    }

    .bookmark-view-priority[data-priority="3"] {
      background: color-mix(in srgb, var(--primary-color) 15%, transparent);
      color: var(--primary-color);
    }

    .bookmark-view-priority[data-priority="4"],
    .bookmark-view-priority[data-priority="5"] {
      background: color-mix(in srgb, #6b7280 15%, transparent);
      color: #6b7280;
    }

    .bookmark-view-notes {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .bookmark-view-notes-content {
      margin: 0;
      padding: 0.875rem;
      background: var(--surface-ground);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-color);
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.5;
    }

    .bookmark-view-notes-empty {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
      font-style: italic;
    }
  `]
})
export class BookmarkViewDialogComponent {
  @Input() visible = false;
  @Input() bookmark: BookMark | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();

  onClose(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  getPriorityLabelKey(priority: number | undefined): string {
    if (priority === undefined) return 'readers.epub.bookmarkViewDialog.priority.normal';
    if (priority <= 1) return 'readers.epub.bookmarkViewDialog.priority.highest';
    if (priority === 2) return 'readers.epub.bookmarkViewDialog.priority.high';
    if (priority === 3) return 'readers.epub.bookmarkViewDialog.priority.normal';
    if (priority === 4) return 'readers.epub.bookmarkViewDialog.priority.low';
    return 'readers.epub.bookmarkViewDialog.priority.lowest';
  }
}
