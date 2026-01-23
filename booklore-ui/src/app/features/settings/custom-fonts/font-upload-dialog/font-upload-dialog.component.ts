import {Component, ViewChild, ElementRef, OnDestroy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Button} from 'primeng/button';
import {MessageService} from 'primeng/api';
import {CustomFontService} from '../../../../shared/service/custom-font.service';
import {formatFileSize} from '../../../../shared/model/custom-font.model';
import {InputText} from 'primeng/inputtext';
import {FormsModule} from '@angular/forms';
import {DynamicDialogRef} from 'primeng/dynamicdialog';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-font-upload-dialog',
  standalone: true,
  imports: [CommonModule, Button, InputText, FormsModule, TranslateModule],
  templateUrl: './font-upload-dialog.component.html',
  styleUrls: ['./font-upload-dialog.component.scss']
})
export class FontUploadDialogComponent implements OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isUploading = false;
  uploadedFontName = '';
  selectedFile: File | null = null;
  isDragOver = false;
  previewFontFamily: string | null = null;
  isLoadingPreview = false;
  currentPreviewToken: number | null = null;

  readonly maxFileSize = 5242880;
  readonly maxFonts = 10;
  readonly acceptedFormats = ['.ttf', '.otf', '.woff', '.woff2'];

  constructor(
    private customFontService: CustomFontService,
    private messageService: MessageService,
    private dialogRef: DynamicDialogRef,
    private translateService: TranslateService
  ) {}

  onUploadZoneClick(): void {
    if (this.isUploading) {
      return;
    }
    this.fileInput.nativeElement.click();
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!this.validateFile(file)) {
      input.value = '';
      return;
    }

    this.processFile(file);
    input.value = '';
  }

  async loadFontPreview(file: File): Promise<void> {
    this.cleanupPreviewFont();

    const previewToken = Date.now();
    this.currentPreviewToken = previewToken;

    if (this.isLoadingPreview) {
      console.log('Cancelling previous preview load');
    }

    this.isLoadingPreview = true;

    try {
      const previewFontName = `preview-font-${previewToken}`;
      const arrayBuffer = await file.arrayBuffer();

      if (this.currentPreviewToken !== previewToken) {
        console.log('Preview operation cancelled - newer preview started');
        return;
      }

      const fontFace = new FontFace(previewFontName, arrayBuffer);
      await fontFace.load();

      if (this.currentPreviewToken !== previewToken) {
        console.log('Preview operation cancelled after load - newer preview started');
        document.fonts.delete(fontFace);
        return;
      }

      document.fonts.add(fontFace);
      this.previewFontFamily = `"${previewFontName}"`;
    } catch (error) {
      if (this.currentPreviewToken === previewToken) {
        console.error('Failed to load font preview:', error);
        this.previewFontFamily = null;
        this.messageService.add({
          severity: 'warn',
          summary: this.translateService.instant('settings.customFonts.uploadDialog.toast.previewFailed.summary'),
          detail: this.translateService.instant('settings.customFonts.uploadDialog.toast.previewFailed.detail')
        });
      }
    } finally {
      if (this.currentPreviewToken === previewToken) {
        this.isLoadingPreview = false;
      }
    }
  }

  uploadFont(): void {
    if (!this.selectedFile) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('settings.customFonts.uploadDialog.toast.noFileSelected.summary'),
        detail: this.translateService.instant('settings.customFonts.uploadDialog.toast.noFileSelected.detail')
      });
      return;
    }

    this.isUploading = true;
    this.customFontService.uploadFont(this.selectedFile, this.uploadedFontName || undefined).subscribe({
      next: (font) => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('settings.customFonts.uploadDialog.toast.uploadSuccess.summary'),
          detail: this.translateService.instant('settings.customFonts.uploadDialog.toast.uploadSuccess.detail', {fontName: font.fontName})
        });
        this.isUploading = false;
        this.dialogRef.close(font); // Return the uploaded font
      },
      error: (error) => {
        console.error('Failed to upload font:', error);
        let errorMessage = this.translateService.instant('settings.customFonts.uploadDialog.toast.uploadFailed.detail.generic');
        if (error.status === 400) {
          errorMessage = this.translateService.instant('settings.customFonts.uploadDialog.toast.uploadFailed.detail.badRequest');
        }
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('settings.customFonts.uploadDialog.toast.uploadFailed.summary'),
          detail: errorMessage
        });

        this.isUploading = false;
        this.selectedFile = null;
        this.uploadedFontName = '';
        this.cleanupPreviewFont();
      }
    });
  }

  formatFileSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  cancel(): void {
    this.cleanupPreviewFont();
    this.dialogRef.close(null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];

      if (!this.validateFile(file)) {
        return;
      }

      this.processFile(file);
    }
  }

  private validateFile(file: File): boolean {
    const fileName = file.name.toLowerCase();
    const isValidFormat = this.acceptedFormats.some(format => fileName.endsWith(format));

    if (!isValidFormat) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('settings.customFonts.uploadDialog.error.invalidType.summary'),
        detail: this.translateService.instant('settings.customFonts.uploadDialog.error.invalidType.detail')
      });
      return false;
    }

    if (file.size > this.maxFileSize) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('settings.customFonts.uploadDialog.error.fileTooLarge.summary'),
        detail: this.translateService.instant('settings.customFonts.uploadDialog.error.fileTooLarge.detail', {size: this.formatFileSize(this.maxFileSize)})
      });
      return false;
    }

    return true;
  }

  private processFile(file: File): void {
    this.selectedFile = file;
    this.uploadedFontName = file.name.replace(/\.[^/.]+$/, '');
    this.loadFontPreview(file);
  }

  cleanupPreviewFont(): void {
    if (this.previewFontFamily) {
      const fontName = this.previewFontFamily.replace(/"/g, '');

      try {
        for (const font of document.fonts) {
          if (font.family === fontName) {
            document.fonts.delete(font);
          }
        }
      } catch (error) {
        console.error('Failed to cleanup preview font:', fontName, error);
      }

      this.previewFontFamily = null;
    }

    this.currentPreviewToken = null;
    this.isLoadingPreview = false;
  }

  ngOnDestroy(): void {
    this.cleanupPreviewFont();
  }
}
