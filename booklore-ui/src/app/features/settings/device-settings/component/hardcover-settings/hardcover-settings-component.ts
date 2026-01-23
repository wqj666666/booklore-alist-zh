import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InputText} from 'primeng/inputtext';
import {ToggleSwitch} from 'primeng/toggleswitch';
import {Button} from 'primeng/button';
import {ToastModule} from 'primeng/toast';
import {MessageService} from 'primeng/api';
import {Subject} from 'rxjs';
import {filter, takeUntil} from 'rxjs/operators';
import {ExternalDocLinkComponent} from '../../../../../shared/components/external-doc-link/external-doc-link.component';
import {UserService} from '../../../user-management/user.service';
import {HardcoverSyncSettingsService} from './hardcover-sync-settings.service';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-hardcover-settings-component',
  imports: [
    FormsModule,
    InputText,
    ToggleSwitch,
    Button,
    ToastModule,
    ExternalDocLinkComponent,
    TranslateModule
  ],
  providers: [MessageService],
  templateUrl: './hardcover-settings-component.html',
  styleUrls: ['./hardcover-settings-component.scss']
})
export class HardcoverSettingsComponent implements OnInit, OnDestroy {
  private readonly messageService = inject(MessageService);
  private readonly hardcoverSyncSettingsService = inject(HardcoverSyncSettingsService);
  private readonly userService = inject(UserService);
  private readonly translateService = inject(TranslateService);
  private readonly destroy$ = new Subject<void>();

  hasPermission = false;
  hardcoverSyncEnabled = false;
  hardcoverApiKey = '';
  showHardcoverApiKey = false;

  ngOnInit() {
    let prevHasPermission = false;
    this.userService.userState$.pipe(
      filter(userState => !!userState?.user && userState.loaded),
      takeUntil(this.destroy$)
    ).subscribe(userState => {
      const currHasPermission = (userState.user?.permissions.canSyncKoReader
        || userState.user?.permissions.canSyncKobo
        || userState.user?.permissions.admin) ?? false;
      this.hasPermission = currHasPermission;
      if (currHasPermission && !prevHasPermission) {
        this.loadHardcoverSettings();
      }
      prevHasPermission = currHasPermission;
    });
  }

  private loadHardcoverSettings() {
    this.hardcoverSyncSettingsService.getSettings().subscribe({
      next: settings => {
        this.hardcoverSyncEnabled = settings.hardcoverSyncEnabled ?? false;
        this.hardcoverApiKey = settings.hardcoverApiKey ?? '';
      },
      error: () => {
        this.showMessage('error', 'settings.device.hardcover.toast.loadError.summary', 'settings.device.hardcover.toast.loadError.detail');
      }
    });
  }

  toggleShowHardcoverApiKey() {
    this.showHardcoverApiKey = !this.showHardcoverApiKey;
  }

  onHardcoverSyncToggle() {
    this.updateHardcoverSettings(
      this.hardcoverSyncEnabled
        ? 'settings.device.hardcover.toast.syncEnabled.detail'
        : 'settings.device.hardcover.toast.syncDisabled.detail'
    );
  }

  onHardcoverApiKeyChange() {
    this.updateHardcoverSettings('settings.device.hardcover.toast.apiKeyUpdated.detail');
  }

  private updateHardcoverSettings(successDetailKey: string) {
    this.hardcoverSyncSettingsService.updateSettings({
      hardcoverSyncEnabled: this.hardcoverSyncEnabled,
      hardcoverApiKey: this.hardcoverApiKey
    }).subscribe({
      next: settings => {
        this.hardcoverSyncEnabled = settings.hardcoverSyncEnabled ?? false;
        this.hardcoverApiKey = settings.hardcoverApiKey ?? '';
        this.showMessage('success', 'settings.device.hardcover.toast.settingsUpdated.summary', successDetailKey);
      },
      error: () => {
        this.showMessage('error', 'settings.device.hardcover.toast.updateFailed.summary', 'settings.device.hardcover.toast.updateFailed.detail');
      }
    });
  }

  copyText(text: string, labelKey: string = 'settings.device.clipboard.label.text') {
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private showMessage(severity: 'success' | 'error', summaryKey: string, detailKey: string, params?: Record<string, unknown>): void {
    this.messageService.add({
      severity,
      summary: this.translateService.instant(summaryKey, params),
      detail: this.translateService.instant(detailKey, params)
    });
  }
}
