import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {FileSelectEvent, FileUpload} from 'primeng/fileupload';
import {Button} from 'primeng/button';
import {AsyncPipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MessageService} from 'primeng/api';
import {Select} from 'primeng/select';
import {Badge} from 'primeng/badge';
import {LibraryService} from '../../../features/book/service/library.service';
import {Library, LibraryPath} from '../../../features/book/model/library.model';
import {LibraryState} from '../../../features/book/model/state/library-state.model';
import {Observable} from 'rxjs';
import {API_CONFIG} from '../../../core/config/api-config';
import {Book} from '../../../features/book/model/book.model';
import {HttpClient} from '@angular/common/http';
import {Tooltip} from 'primeng/tooltip';
import {AppSettingsService} from '../../service/app-settings.service';
import {filter, take} from 'rxjs/operators';
import {AppSettings} from '../../model/app-settings.model';
import {SelectButton} from 'primeng/selectbutton';
import {DynamicDialogRef} from 'primeng/dynamicdialog';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

interface UploadingFile {
  file: File;
  status: 'Pending' | 'Uploading' | 'Uploaded' | 'Failed';
  errorMessage?: string;
  errorCode?: 'MAX_FILE_SIZE' | 'UPLOAD_FAILED';
}

@Component({
  selector: 'app-book-uploader',
  standalone: true,
  imports: [
    FileUpload,
    Button,
    AsyncPipe,
    FormsModule,
    Select,
    Badge,
    Tooltip,
    SelectButton,
    TranslateModule
  ],
  templateUrl: './book-uploader.component.html',
  styleUrl: './book-uploader.component.scss'
})
export class BookUploaderComponent implements OnInit {
  files: UploadingFile[] = [];
  isUploading: boolean = false;
  uploadCompleted: boolean = false;
  _selectedLibrary: Library | null = null;
  selectedPath: LibraryPath | null = null;

  private readonly libraryService = inject(LibraryService);
  private readonly messageService = inject(MessageService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly http = inject(HttpClient);
  private readonly ref = inject(DynamicDialogRef);
  private readonly translateService = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly libraryState$: Observable<LibraryState> = this.libraryService.libraryState$;
  appSettings$: Observable<AppSettings | null> = this.appSettingsService.appSettings$;
  maxFileSizeBytes?: number;
  maxFileSizeDisplay: string = '100 MB';
  stateOptions: {label: string; value: 'library' | 'bookdrop'}[] = [];
  value = 'library';

  ngOnInit(): void {
    this.rebuildStateOptions();
    this.translateService.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.rebuildStateOptions());

    this.appSettings$
      .pipe(
        filter(settings => settings != null),
        take(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(settings => {
        const maxSizeMb = settings?.maxFileUploadSizeInMb ?? 100;
        this.maxFileSizeBytes = maxSizeMb * 1024 * 1024;
        this.maxFileSizeDisplay = `${maxSizeMb} MB`;
      });

    this.libraryState$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(state => {
      if (state?.libraries?.length !== 1 || this.selectedLibrary) {
        return;
      }

      this.selectedLibrary = state.libraries[0];
    });
  }

  private rebuildStateOptions(): void {
    this.stateOptions = [
      {label: this.translateService.instant('shared.bookUploader.destinationOption.library'), value: 'library'},
      {label: this.translateService.instant('shared.bookUploader.destinationOption.bookdrop'), value: 'bookdrop'}
    ];
  }

  get selectedLibrary(): Library | null {
    return this._selectedLibrary;
  }

  set selectedLibrary(library: Library | null) {
    this._selectedLibrary = library;

    if (library?.paths?.length === 1) {
      this.selectedPath = library.paths[0];
    }
  }

  hasPendingFiles(): boolean {
    return this.files.some(f => f.status === 'Pending');
  }

  filesPresent(): boolean {
    return this.files.length > 0;
  }

  choose(_event: Event, chooseCallback: () => void): void {
    chooseCallback();
  }

  onClear(clearCallback: () => void): void {
    clearCallback();
    this.files = [];
  }

  onFilesSelect(event: FileSelectEvent): void {
    const newFiles = event.currentFiles;
    for (const file of newFiles) {
      const exists = this.files.some(f => f.file.name === file.name && f.file.size === file.size);
      if (exists) {
        continue;
      }

      if (this.maxFileSizeBytes && file.size > this.maxFileSizeBytes) {
        const maxSize = this.formatSize(this.maxFileSizeBytes);
        const errorMsg = this.translateService.instant('shared.bookUploader.error.fileExceedsMaxSize', {size: maxSize});
        this.files.unshift({
          file,
          status: 'Failed',
          errorMessage: errorMsg,
          errorCode: 'MAX_FILE_SIZE'
        });
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('shared.bookUploader.toast.fileTooLarge.summary'),
          detail: this.translateService.instant('shared.bookUploader.toast.fileTooLarge.detail', {fileName: file.name, size: maxSize}),
          life: 5000
        });
      } else {
        this.files.unshift({file, status: 'Pending'});
      }
    }
  }

  onRemoveTemplatingFile(_event: Event, _file: File, removeFileCallback: (event: Event, index: number) => void, index: number): void {
    removeFileCallback(_event, index);
  }

  uploadEvent(uploadCallback: () => void): void {
    uploadCallback();
  }

  uploadFiles(): void {
    if (this.value === 'library' && (!this.selectedLibrary || !this.selectedPath)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('shared.bookUploader.toast.missingData.summary'),
        detail: this.translateService.instant('shared.bookUploader.toast.missingData.detail'),
        life: 4000
      });
      return;
    }

    const filesToUpload = this.files.filter(f => f.status === 'Pending');
    if (filesToUpload.length === 0) return;

    this.isUploading = true;
    this.uploadCompleted = false;
    const destination = this.value;
    const libraryId = this.selectedLibrary?.id?.toString();
    const pathId = this.selectedPath?.id?.toString();

    this.uploadBatch(filesToUpload, 0, 1, destination, libraryId, pathId);
  }

  private uploadBatch(files: UploadingFile[], startIndex: number, batchSize: number, destination: string, libraryId?: string, pathId?: string): void {
    const batch = files.slice(startIndex, startIndex + batchSize);
    if (batch.length === 0) {
      this.isUploading = false;
      this.uploadCompleted = true;
      if (destination === 'bookdrop') {
        this.ref.close('uploaded_to_bookdrop');
      }
      return;
    }

    let pending = batch.length;

    for (const uploadFile of batch) {
      uploadFile.status = 'Uploading';

      const formData = new FormData();
      const cleanFile = new File([uploadFile.file], uploadFile.file.name, {type: uploadFile.file.type});
      formData.append('file', cleanFile, uploadFile.file.name);

      let uploadUrl: string;
      if (destination === 'library') {
        if (libraryId && pathId) {
          formData.append('libraryId', libraryId);
          formData.append('pathId', pathId);
        }
        uploadUrl = `${API_CONFIG.BASE_URL}/api/v1/files/upload`;
      } else {
        uploadUrl = `${API_CONFIG.BASE_URL}/api/v1/files/upload/bookdrop`;
      }

      this.http.post<Book>(uploadUrl, formData).subscribe({
        next: () => {
          uploadFile.status = 'Uploaded';
          if (--pending === 0) {
            setTimeout(() => {
              this.uploadBatch(files, startIndex + batchSize, batchSize, destination, libraryId, pathId);
            }, 1000);
          }
        },
        error: (err) => {
          uploadFile.status = 'Failed';
          uploadFile.errorCode = 'UPLOAD_FAILED';
          uploadFile.errorMessage = err?.error?.message || this.translateService.instant('shared.bookUploader.error.uploadFailedUnknown');
          console.error('Upload failed for', uploadFile.file.name, err);
          if (--pending === 0) {
            setTimeout(() => {
              this.uploadBatch(files, startIndex + batchSize, batchSize, destination, libraryId, pathId);
            }, 1000);
          }
        }
      });
    }
  }

  isChooseDisabled(): boolean {
    if (this.value === 'bookdrop') {
      return this.isUploading;
    }
    return !this.selectedLibrary || !this.selectedPath || this.isUploading;
  }

  isUploadDisabled(): boolean {
    return this.isChooseDisabled() || !this.filesPresent() || !this.hasPendingFiles();
  }

  isUploadZoneActive(): boolean {
    if (this.value === 'bookdrop') {
      return true;
    }
    return !!(this.selectedLibrary && this.selectedPath);
  }

  formatSize(bytes: number): string {
    const k = 1024;
    const dm = 2;
    if (bytes < k) return `${bytes} B`;
    if (bytes < k * k) return `${(bytes / k).toFixed(dm)} KB`;
    return `${(bytes / (k * k)).toFixed(dm)} MB`;
  }

  getBadgeSeverity(status: UploadingFile['status']): 'info' | 'warn' | 'success' | 'danger' {
    switch (status) {
      case 'Pending':
        return 'warn';
      case 'Uploading':
        return 'info';
      case 'Uploaded':
        return 'success';
      case 'Failed':
        return 'danger';
      default:
        return 'info';
    }
  }

  getFileStatusLabel(uploadFile: UploadingFile): string {
    if (uploadFile.status === 'Failed' && uploadFile.errorCode === 'MAX_FILE_SIZE') {
      return this.translateService.instant('shared.bookUploader.status.tooLarge');
    }
    switch (uploadFile.status) {
      case 'Pending':
        return this.translateService.instant('shared.bookUploader.status.ready');
      case 'Uploading':
        return this.translateService.instant('shared.bookUploader.status.uploading');
      case 'Uploaded':
        return this.translateService.instant('shared.bookUploader.status.uploaded');
      case 'Failed':
        return this.translateService.instant('shared.bookUploader.status.failed');
      default:
        return uploadFile.status;
    }
  }

  hasUploadCompleted(): boolean {
    return this.uploadCompleted;
  }

  closeDialog(): void {
    this.ref.close();
  }
}
