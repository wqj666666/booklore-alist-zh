import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputText} from 'primeng/inputtext';
import {ToggleSwitch} from 'primeng/toggleswitch';
import {Button} from 'primeng/button';
import {ToastModule} from 'primeng/toast';
import {MessageService} from 'primeng/api';
import {InputNumber} from 'primeng/inputnumber';
import {Divider} from 'primeng/divider';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {HttpClient} from '@angular/common/http';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {API_CONFIG} from '../../../core/config/api-config';

export interface AListSettings {
  enabled: boolean;
  baseUrl: string;
  username: string;
  password: string;
  token: string;
  connectTimeout: number;
  readTimeout: number;
  enableRedirectDownload: boolean;
}

@Component({
  standalone: true,
  selector: 'app-storage-settings',
  imports: [
    FormsModule,
    InputText,
    ToggleSwitch,
    Button,
    ToastModule,
    InputNumber,
    Divider,
    TranslateModule
  ],
  providers: [MessageService],
  templateUrl: './storage-settings.component.html',
  styleUrls: ['./storage-settings.component.scss']
})
export class StorageSettingsComponent implements OnInit, OnDestroy {
  private readonly messageService = inject(MessageService);
  private readonly translateService = inject(TranslateService);
  private readonly http = inject(HttpClient);
  private readonly destroy$ = new Subject<void>();

  editMode = false;
  showPassword = false;
  showToken = false;
  loading = false;

  settings: AListSettings = {
    enabled: false,
    baseUrl: '',
    username: '',
    password: '',
    token: '',
    connectTimeout: 30000,
    readTimeout: 300000,
    enableRedirectDownload: true
  };

  originalSettings: AListSettings = {...this.settings};

  ngOnInit(): void {
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSettings(): void {
    this.loading = true;
    this.http.get<AListSettings>(`${API_CONFIG.BASE_URL}/api/settings/alist`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (settings) => {
          this.settings = settings;
          this.originalSettings = {...settings};
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          if (err.status !== 404) {
            this.showMessage('error', 'settings.storage.toast.loadError.summary', 'settings.storage.toast.loadError.detail');
          }
        }
      });
  }

  get canSave(): boolean {
    return this.settings.baseUrl?.trim().length > 0;
  }

  get hasChanges(): boolean {
    return JSON.stringify(this.settings) !== JSON.stringify(this.originalSettings);
  }

  onEditSave(): void {
    if (this.editMode && this.hasChanges) {
      this.saveSettings();
    }
    this.editMode = !this.editMode;
  }

  onCancel(): void {
    this.settings = {...this.originalSettings};
    this.editMode = false;
  }

  onToggleEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.saveSettings();
  }

  onToggleRedirectDownload(enabled: boolean): void {
    this.settings.enableRedirectDownload = enabled;
    this.saveSettings();
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleShowToken(): void {
    this.showToken = !this.showToken;
  }

  saveSettings(): void {
    this.http.put<AListSettings>(`${API_CONFIG.BASE_URL}/api/settings/alist`, this.settings)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (savedSettings) => {
          this.settings = savedSettings;
          this.originalSettings = {...savedSettings};
          this.showMessage('success', 'settings.storage.toast.saved.summary', 'settings.storage.toast.saved.detail');
        },
        error: () => {
          this.showMessage('error', 'settings.storage.toast.saveFailed.summary', 'settings.storage.toast.saveFailed.detail');
        }
      });
  }

  testConnection(): void {
    this.http.post<{success: boolean; message: string}>(`${API_CONFIG.BASE_URL}/api/settings/alist/test`, this.settings)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.showMessage('success', 'settings.storage.toast.testSuccess.summary', 'settings.storage.toast.testSuccess.detail');
          } else {
            this.showMessage('error', 'settings.storage.toast.testFailed.summary', result.message || 'settings.storage.toast.testFailed.detail');
          }
        },
        error: () => {
          this.showMessage('error', 'settings.storage.toast.testFailed.summary', 'settings.storage.toast.testFailed.detail');
        }
      });
  }

  copyText(text: string, labelKey: string = 'settings.storage.clipboard.label.text'): void {
    if (!text) {
      return;
    }
    const label = this.translateService.instant(labelKey);
    navigator.clipboard.writeText(text).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: this.translateService.instant('settings.device.clipboard.toast.copied.summary'),
        detail: this.translateService.instant('settings.device.clipboard.toast.copied.detail', {label})
      });
    }).catch(err => {
      console.error('Copy failed', err);
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('settings.device.clipboard.toast.copyFailed.summary'),
        detail: this.translateService.instant('settings.device.clipboard.toast.copyFailed.detail', {label: label.toLowerCase()})
      });
    });
  }

  private showMessage(severity: 'success' | 'error', summaryKey: string, detailKey: string, params?: Record<string, unknown>): void {
    this.messageService.add({
      severity,
      summary: this.translateService.instant(summaryKey, params),
      detail: this.translateService.instant(detailKey, params)
    });
  }
}
