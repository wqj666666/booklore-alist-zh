import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {ConfirmationService, MessageService} from 'primeng/api';
import {KoboService, KoboSyncSettings} from './kobo.service';
import {FormsModule} from '@angular/forms';
import {Button} from 'primeng/button';
import {InputText} from 'primeng/inputtext';
import {ConfirmDialog} from 'primeng/confirmdialog';
import {UserService} from '../../../user-management/user.service';
import {Subject} from 'rxjs';
import {debounceTime, filter, take, takeUntil} from 'rxjs/operators';
import {ToggleSwitch} from 'primeng/toggleswitch';
import {Slider} from 'primeng/slider';
import {Divider} from 'primeng/divider';
import {AppSettingsService} from '../../../../../shared/service/app-settings.service';
import {SettingsHelperService} from '../../../../../shared/service/settings-helper.service';
import {AppSettingKey, KoboSettings} from '../../../../../shared/model/app-settings.model';
import {ShelfService} from '../../../../book/service/shelf.service';
import {ExternalDocLinkComponent} from '../../../../../shared/components/external-doc-link/external-doc-link.component';
import {ToastModule} from 'primeng/toast';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-kobo-sync-setting-component',
  standalone: true,
  templateUrl: './kobo-sync-settings-component.html',
  styleUrl: './kobo-sync-settings-component.scss',
  imports: [FormsModule, Button, InputText, ConfirmDialog, ToggleSwitch, Slider, Divider, ExternalDocLinkComponent, ToastModule, TranslateModule],
  providers: [MessageService, ConfirmationService]
})
export class KoboSyncSettingsComponent implements OnInit, OnDestroy {
  private koboService = inject(KoboService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private translateService = inject(TranslateService);
  protected userService = inject(UserService);
  protected appSettingsService = inject(AppSettingsService);
  protected settingsHelperService = inject(SettingsHelperService);
  private shelfService = inject(ShelfService);

  private readonly destroy$ = new Subject<void>();
  private readonly sliderChange$ = new Subject<void>();
  private readonly progressThresholdChange$ = new Subject<void>();

  hasKoboTokenPermission = false;
  isAdmin = false;
  credentialsSaved = false;
  showToken = false;

  koboSettings: KoboSettings = {
    convertToKepub: false,
    conversionLimitInMb: 100,
    convertCbxToEpub: false,
    conversionImageCompressionPercentage: 85,
    conversionLimitInMbForCbx: 100,
    forceEnableHyphenation: false
  };

  koboSyncSettings: KoboSyncSettings = {
    token: '',
    syncEnabled: false,
    progressMarkAsReadingThreshold: 1,
    progressMarkAsFinishedThreshold: 99,
    autoAddToShelf: true
  }

  ngOnInit() {
    this.setupSliderDebouncing();
    this.setupUserStateSubscription();
  }

  private setupSliderDebouncing() {
    this.sliderChange$.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.saveSettings();
    });

    this.progressThresholdChange$.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateKoboSettings('settings.device.kobo.toast.progressThresholdsUpdated.detail');
    });
  }

  private setupUserStateSubscription() {
    let prevHasKoboTokenPermission = false;
    let prevIsAdmin = false;
    this.userService.userState$.pipe(
      filter(userState => !!userState?.user && userState.loaded),
      takeUntil(this.destroy$)
    ).subscribe(userState => {
      const currHasKoboTokenPermission = (userState.user?.permissions.canSyncKobo) ?? false;
      const currIsAdmin = userState.user?.permissions.admin ?? false;

      if (currHasKoboTokenPermission && !prevHasKoboTokenPermission) {
        this.hasKoboTokenPermission = true;
        this.loadKoboUserSettings();
      } else {
        this.hasKoboTokenPermission = currHasKoboTokenPermission;
      }

      if (currIsAdmin && !prevIsAdmin) {
        this.isAdmin = true;
        this.loadKoboAdminSettings();
      } else {
        this.isAdmin = currIsAdmin;
      }

      prevHasKoboTokenPermission = currHasKoboTokenPermission;
      prevIsAdmin = currIsAdmin;
    });
  }

  private loadKoboUserSettings() {
    this.koboService.getUser().subscribe({
      next: (settings: KoboSyncSettings) => {
        this.koboSyncSettings.token = settings.token;
        this.koboSyncSettings.syncEnabled = settings.syncEnabled;
        this.koboSyncSettings.progressMarkAsReadingThreshold = settings.progressMarkAsReadingThreshold ?? 1;
        this.koboSyncSettings.progressMarkAsFinishedThreshold = settings.progressMarkAsFinishedThreshold ?? 99;
        this.koboSyncSettings.autoAddToShelf = settings.autoAddToShelf ?? false;
        this.credentialsSaved = !!settings.token;
      },
      error: () => {
        this.showMessage('error', 'settings.device.kobo.toast.loadError.summary', 'settings.device.kobo.toast.loadError.detail');
      }
    });
  }

  private loadKoboAdminSettings() {
    this.appSettingsService.appSettings$
      .pipe(
        filter(settings => settings != null),
        take(1),
      )
      .subscribe(settings => {
        this.koboSettings.convertToKepub = settings?.koboSettings?.convertToKepub ?? true;
        this.koboSettings.conversionLimitInMb = settings?.koboSettings?.conversionLimitInMb ?? 100;
        this.koboSettings.convertCbxToEpub = settings?.koboSettings?.convertCbxToEpub ?? false;
        this.koboSettings.conversionLimitInMbForCbx = settings?.koboSettings?.conversionLimitInMbForCbx ?? 100;
        this.koboSettings.forceEnableHyphenation = settings?.koboSettings?.forceEnableHyphenation ?? false;
        this.koboSettings.conversionImageCompressionPercentage = settings?.koboSettings?.conversionImageCompressionPercentage ?? 85;
      });
  }

  copyText(text: string, labelKey: string = 'settings.device.clipboard.label.text') {
    if (!text) {
      return;
    }
    const label = this.translateService.instant(labelKey);
    navigator.clipboard.writeText(text).then(() => {
      this.showMessage('success', 'settings.device.clipboard.toast.copied.summary', 'settings.device.clipboard.toast.copied.detail', {label});
    }).catch(err => {
      console.error('Copy failed', err);
      this.showMessage('error', 'settings.device.clipboard.toast.copyFailed.summary', 'settings.device.clipboard.toast.copyFailed.detail', {label: label.toLowerCase()});
    });
  }

  toggleShowToken() {
    this.showToken = !this.showToken;
  }


  confirmRegenerateToken() {
    this.confirmationService.confirm({
      message: this.translateService.instant('settings.device.kobo.confirm.regenerate.message'),
      header: this.translateService.instant('settings.device.kobo.confirm.regenerate.header'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.regenerateToken()
    });
  }

  private regenerateToken() {
    this.koboService.createOrUpdateToken().subscribe({
      next: (settings) => {
        this.koboSyncSettings.token = settings.token;
        this.credentialsSaved = true;
        this.showMessage('success', 'settings.device.kobo.toast.tokenRegenerated.summary', 'settings.device.kobo.toast.tokenRegenerated.detail');
      },
      error: () => {
        this.showMessage('error', 'settings.device.kobo.toast.regenerateTokenFailed.summary', 'settings.device.kobo.toast.regenerateTokenFailed.detail');
      }
    });
  }

  onToggleChange() {
    this.saveSettings();
  }

  onSliderChange() {
    this.sliderChange$.next();
  }

  onSyncToggle() {
    if (!this.koboSyncSettings.syncEnabled) {
      this.confirmationService.confirm({
        message: this.translateService.instant('settings.device.kobo.confirm.disable.message'),
        header: this.translateService.instant('settings.device.kobo.confirm.disable.header'),
        icon: 'pi pi-exclamation-triangle',
        accept: () => this.updateKoboSettings('settings.device.kobo.toast.syncDisabled.detail'),
        reject: () => {
          this.koboSyncSettings.syncEnabled = true;
        }
      });
    } else {
      this.updateKoboSettings('settings.device.kobo.toast.syncEnabled.detail');
    }
  }

  onProgressThresholdsChange() {
    this.progressThresholdChange$.next();
  }

  onAutoAddToggle() {
    this.updateKoboSettings(
      this.koboSyncSettings.autoAddToShelf
        ? 'settings.device.kobo.toast.autoAddEnabled.detail'
        : 'settings.device.kobo.toast.autoAddDisabled.detail'
    );
  }

  private updateKoboSettings(successDetailKey: string) {
    this.koboService.updateSettings(this.koboSyncSettings).subscribe({
      next: () => {
        this.showMessage('success', 'settings.device.kobo.toast.settingsUpdated.summary', successDetailKey);
        if (!this.koboSyncSettings.syncEnabled) {
          this.shelfService.reloadShelves();
        }
      },
      error: () => {
        this.showMessage('error', 'settings.device.kobo.toast.updateFailed.summary', 'settings.device.kobo.toast.updateFailed.detail');
      }
    });
  }

  saveSettings() {
    this.settingsHelperService.saveSetting(AppSettingKey.KOBO_SETTINGS, this.koboSettings)
      .subscribe({
        next: () => {
          this.showMessage('success', 'settings.device.kobo.toast.saved.summary', 'settings.device.kobo.toast.saved.detail');
        },
        error: () => {
          this.showMessage('error', 'settings.device.kobo.toast.saveFailed.summary', 'settings.device.kobo.toast.saveFailed.detail');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private showMessage(
    severity: 'success' | 'info' | 'warn' | 'error',
    summaryKey: string,
    detailKey: string,
    params?: Record<string, unknown>
  ): void {
    this.messageService.add({
      severity,
      summary: this.translateService.instant(summaryKey, params),
      detail: this.translateService.instant(detailKey, params)
    });
  }
}
