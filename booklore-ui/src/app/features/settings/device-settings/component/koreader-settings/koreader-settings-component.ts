import {Component, inject, OnDestroy, OnInit} from '@angular/core';

import {FormsModule} from '@angular/forms';
import {InputText} from 'primeng/inputtext';
import {ToggleSwitch} from 'primeng/toggleswitch';
import {Button} from 'primeng/button';
import {ToastModule} from 'primeng/toast';
import {MessageService} from 'primeng/api';
import {KoreaderService} from './koreader.service';
import {UserService} from '../../../user-management/user.service';
import {filter, takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {ExternalDocLinkComponent} from '../../../../../shared/components/external-doc-link/external-doc-link.component';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-koreader-settings-component',
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
  templateUrl: './koreader-settings-component.html',
  styleUrls: ['./koreader-settings-component.scss']
})
export class KoreaderSettingsComponent implements OnInit, OnDestroy {
  editMode = true;
  showPassword = false;
  koReaderSyncEnabled = false;
  koReaderUsername = '';
  koReaderPassword = '';
  credentialsSaved = false;
  readonly koreaderEndpoint = `${window.location.origin}/api/koreader`;

  private readonly messageService = inject(MessageService);
  private readonly koreaderService = inject(KoreaderService);
  private readonly userService = inject(UserService);
  private readonly translateService = inject(TranslateService);

  private readonly destroy$ = new Subject<void>();
  hasPermission = false;

  ngOnInit() {
    let prevHasPermission = false;
    this.userService.userState$.pipe(
      filter(userState => !!userState?.user && userState.loaded),
      takeUntil(this.destroy$)
    ).subscribe(userState => {
      const currHasPermission = (userState.user?.permissions.canSyncKoReader || userState.user?.permissions.admin) ?? false;
      this.hasPermission = currHasPermission;
      if (currHasPermission && !prevHasPermission) {
        this.loadKoreaderSettings();
      }
      prevHasPermission = currHasPermission;
    });
  }

  private loadKoreaderSettings() {
    this.koreaderService.getUser().subscribe({
      next: koreaderUser => {
        this.koReaderUsername = koreaderUser.username;
        this.koReaderPassword = koreaderUser.password;
        this.koReaderSyncEnabled = koreaderUser.syncEnabled;
        this.credentialsSaved = true;
      },
      error: err => {
        if (err.status !== 404) {
          this.showMessage('error', 'settings.device.koreader.toast.loadError.summary', 'settings.device.koreader.toast.loadError.detail');
        }
      }
    });
  }


  get canSave(): boolean {
    const u = this.koReaderUsername?.trim() ?? '';
    const p = this.koReaderPassword ?? '';
    return u.length > 0 && p.length >= 6;
  }

  onEditSave() {
    if (!this.editMode) {
      this.saveCredentials();
    }
    this.editMode = !this.editMode;
  }

  onToggleEnabled(enabled: boolean) {
    this.koreaderService.toggleSync(enabled).subscribe({
      next: () => {
        this.koReaderSyncEnabled = enabled;
        this.showMessage(
          'success',
          'settings.device.koreader.toast.syncUpdated.summary',
          enabled ? 'settings.device.koreader.toast.syncEnabled.detail' : 'settings.device.koreader.toast.syncDisabled.detail'
        );
      },
      error: () => {
        this.showMessage('error', 'settings.device.koreader.toast.updateFailed.summary', 'settings.device.koreader.toast.updateFailed.detail');
      }
    });
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }


  saveCredentials() {
    this.koreaderService.createUser(this.koReaderUsername, this.koReaderPassword)
      .subscribe({
        next: () => {
          this.credentialsSaved = true;
          this.showMessage('success', 'settings.device.koreader.toast.saved.summary', 'settings.device.koreader.toast.saved.detail');
        },
        error: () =>
          this.showMessage('error', 'settings.device.koreader.toast.saveFailed.summary', 'settings.device.koreader.toast.saveFailed.detail')
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
