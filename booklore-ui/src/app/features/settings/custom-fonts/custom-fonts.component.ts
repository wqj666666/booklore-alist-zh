import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Button} from 'primeng/button';
import {MessageService} from 'primeng/api';
import {CustomFontService} from '../../../shared/service/custom-font.service';
import {CustomFont, formatFileSize} from '../../../shared/model/custom-font.model';
import {ConfirmDialog} from 'primeng/confirmdialog';
import {ConfirmationService} from 'primeng/api';
import {Tooltip} from 'primeng/tooltip';
import {DialogService, DynamicDialogRef} from 'primeng/dynamicdialog';
import {FontUploadDialogComponent} from './font-upload-dialog/font-upload-dialog.component';
import {Skeleton} from 'primeng/skeleton';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-custom-fonts',
  standalone: true,
  imports: [CommonModule, Button, ConfirmDialog, Tooltip, Skeleton, TranslateModule],
  templateUrl: './custom-fonts.component.html',
  styleUrls: ['./custom-fonts.component.scss'],
  providers: [ConfirmationService, DialogService]
})
export class CustomFontsComponent implements OnInit {
  customFonts: CustomFont[] = [];
  isLoading = true;
  fontsLoadedInBrowser = false;
  uploadDialogRef: DynamicDialogRef | null = null;

  readonly maxFonts = 10;

  constructor(
    private customFontService: CustomFontService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private dialogService: DialogService,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadFonts();
  }

  async loadFonts(): Promise<void> {
    this.fontsLoadedInBrowser = false;

    try {
      const fonts = await new Promise<CustomFont[]>((resolve, reject) => {
        this.customFontService.getUserFonts().subscribe({
          next: resolve,
          error: reject
        });
      });

      this.customFonts = fonts;
      this.isLoading = false;

      await this.customFontService.loadAllFonts(fonts);

      this.fontsLoadedInBrowser = true;
    } catch (error) {
      console.error('Failed to load fonts:', error);
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('settings.customFonts.toast.loadFailed.summary'),
        detail: this.translateService.instant('settings.customFonts.toast.loadFailed.detail')
      });
      this.isLoading = false;
      this.fontsLoadedInBrowser = true;
    }
  }

  openUploadDialog(): void {
    if (this.customFonts.length >= this.maxFonts) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('settings.customFonts.toast.quotaExceeded.summary'),
        detail: this.translateService.instant('settings.customFonts.toast.quotaExceeded.detail', {max: this.maxFonts})
      });
      return;
    }

    this.uploadDialogRef = this.dialogService.open(FontUploadDialogComponent, {
      showHeader: false,
      styleClass: 'dynamic-dialog-minimal',
      modal: true,
      dismissableMask: false,
      closable: false,
      width: '700px',
      breakpoints: {
        '768px': '95vw'
      }
    });

    if (this.uploadDialogRef) {
      this.uploadDialogRef.onClose.subscribe((font: CustomFont | null) => {
        if (font) {
          this.customFonts.push(font);
        }
        this.uploadDialogRef = null;
      });
    }
  }

  deleteFont(font: CustomFont): void {
    this.confirmationService.confirm({
      message: this.translateService.instant('settings.customFonts.confirm.delete.message', {fontName: font.fontName}),
      header: this.translateService.instant('settings.customFonts.confirm.delete.header'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.customFontService.deleteFont(font.id).subscribe({
          next: () => {
            this.customFonts = this.customFonts.filter(f => f.id !== font.id);
            this.messageService.add({
              severity: 'success',
              summary: this.translateService.instant('settings.customFonts.toast.deleteSuccess.summary'),
              detail: this.translateService.instant('settings.customFonts.toast.deleteSuccess.detail', {fontName: font.fontName})
            });
          },
          error: (error) => {
            console.error('Failed to delete font:', error);
            this.messageService.add({
              severity: 'error',
              summary: this.translateService.instant('settings.customFonts.toast.deleteFailed.summary'),
              detail: this.translateService.instant('settings.customFonts.toast.deleteFailed.detail')
            });
          }
        });
      }
    });
  }

  formatFileSize(bytes: number): string {
    return formatFileSize(bytes);
  }
}
