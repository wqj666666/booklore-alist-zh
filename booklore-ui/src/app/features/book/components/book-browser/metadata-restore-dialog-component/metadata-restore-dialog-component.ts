import {Component, inject, OnInit} from '@angular/core';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';
import {Button} from 'primeng/button';
import {BookService} from '../../../service/book.service';
import {Book, BookMetadata} from '../../../model/book.model';
import {MessageService} from 'primeng/api';
import {UrlHelperService} from '../../../../../shared/service/url-helper.service';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-metadata-restore-dialog-component',
  standalone: true,
  imports: [Button, TranslateModule],
  templateUrl: './metadata-restore-dialog-component.html',
  styleUrl: './metadata-restore-dialog-component.scss'
})
export class MetadataRestoreDialogComponent implements OnInit {

  bookId!: number;
  book!: Book | undefined;
  backupMetadata: BookMetadata | null = null;

  private dynamicDialogConfig = inject(DynamicDialogConfig);
  protected dynamicDialogRef = inject(DynamicDialogRef);
  protected bookService = inject(BookService);
  private messageService = inject(MessageService);
  protected urlHelperService = inject(UrlHelperService);
  private translate = inject(TranslateService);

  ngOnInit(): void {
    this.bookId = this.dynamicDialogConfig.data.bookId;
    this.book = this.bookService.getBookByIdFromState(this.bookId);

    this.bookService.getBackupMetadata(this.bookId).subscribe({
      next: (data) => {
        this.backupMetadata = data;
      },
      error: err => {
        const fallbackDetail = this.translate.instant('book.metadataRestoreDialog.toast.noBackupFound.detail');
        const detail = err?.error?.message || fallbackDetail;
        this.messageService.add({
          severity: 'warn',
          summary: this.translate.instant('book.metadataRestoreDialog.toast.noBackupFound.summary'),
          detail,
        });
        this.backupMetadata = null;
      }
    });
  }

  onRestore(): void {
    this.bookService.restoreMetadata(this.bookId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('book.metadataRestoreDialog.toast.restoreSuccessful.summary'),
          detail: this.translate.instant('book.metadataRestoreDialog.toast.restoreSuccessful.detail', {bookId: this.bookId}),
        });
        this.dynamicDialogRef.close({ action: 'restore', bookId: this.bookId });
      },
      error: err => {
        const errorMessage = err?.error?.message || err?.message || this.translate.instant('book.metadataRestoreDialog.toast.unknownError');
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('book.metadataRestoreDialog.toast.restoreFailed.summary'),
          detail: this.translate.instant('book.metadataRestoreDialog.toast.restoreFailed.detail', {message: errorMessage}),
        });
      }
    });
  }
}
