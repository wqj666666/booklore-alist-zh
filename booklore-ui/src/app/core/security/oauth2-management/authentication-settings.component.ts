import {Component, inject, OnInit} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {InputText} from 'primeng/inputtext';
import {Button} from 'primeng/button';

import {Checkbox} from 'primeng/checkbox';
import {ToggleSwitch} from 'primeng/toggleswitch';
import {MessageService} from 'primeng/api';
import {AppSettingsService} from '../../../shared/service/app-settings.service';
import {Observable} from 'rxjs';
import {AppSettingKey, AppSettings, OidcProviderDetails} from '../../../shared/model/app-settings.model';
import {filter, take} from 'rxjs/operators';
import {MultiSelect} from 'primeng/multiselect';
import {Library} from '../../../features/book/model/library.model';
import {LibraryService} from '../../../features/book/service/library.service';
import {ExternalDocLinkComponent} from '../../../shared/components/external-doc-link/external-doc-link.component';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-authentication-settings',
  templateUrl: './authentication-settings.component.html',
  standalone: true,
  imports: [
    FormsModule,
    InputText,
    Checkbox,
    ToggleSwitch,
    Button,
    MultiSelect,
    ReactiveFormsModule,
    ExternalDocLinkComponent,
    TranslateModule
  ],
  styleUrls: ['./authentication-settings.component.scss']
})
export class AuthenticationSettingsComponent implements OnInit {
  availablePermissions = [
    {labelKey: 'settings.authentication.permissions.uploadBooks', value: 'permissionUpload', selected: false},
    {labelKey: 'settings.authentication.permissions.downloadBooks', value: 'permissionDownload', selected: false},
    {labelKey: 'settings.authentication.permissions.editBookMetadata', value: 'permissionEditMetadata', selected: false},
    {labelKey: 'settings.authentication.permissions.manageLibrary', value: 'permissionManipulateLibrary', selected: false},
    {labelKey: 'settings.authentication.permissions.emailBook', value: 'permissionEmailBook', selected: false},
    {labelKey: 'settings.authentication.permissions.deleteBook', value: 'permissionDeleteBook', selected: false},
    {labelKey: 'settings.authentication.permissions.koreaderSync', value: 'permissionSyncKoreader', selected: false},
    {labelKey: 'settings.authentication.permissions.koboSync', value: 'permissionSyncKobo', selected: false},
    {labelKey: 'settings.authentication.permissions.accessOpds', value: 'permissionAccessOpds', selected: false}
  ];

  internalAuthEnabled = true;
  autoUserProvisioningEnabled = false;
  selectedPermissions: string[] = [];
  oidcEnabled = false;
  allLibraries: Library[] = [];
  editingLibraryIds: number[] = [];

  oidcProvider: OidcProviderDetails = {
    providerName: '',
    clientId: '',
    issuerUri: '',
    claimMapping: {
      username: '',
      email: '',
      name: ''
    }
  };

  private appSettingsService = inject(AppSettingsService);
  private messageService = inject(MessageService);
  private libraryService = inject(LibraryService);
  private translateService = inject(TranslateService);

  appSettings$: Observable<AppSettings | null> = this.appSettingsService.appSettings$;

  ngOnInit(): void {
    this.appSettings$.pipe(
      filter((settings): settings is AppSettings => settings != null),
      take(1)
    ).subscribe(settings => this.loadSettings(settings));

    this.libraryService.libraryState$
      .pipe(
        filter(state => !!state?.loaded),
        take(1)
      ).subscribe(state => this.allLibraries = state.libraries ?? []);
  }

  loadSettings(settings: AppSettings): void {
    this.oidcEnabled = settings.oidcEnabled;

    const details = settings.oidcAutoProvisionDetails;

    this.autoUserProvisioningEnabled = details?.enableAutoProvisioning ?? false;
    this.selectedPermissions = details?.defaultPermissions ?? [];
    this.editingLibraryIds = details?.defaultLibraryIds ?? [];

    const defaultClaimMapping = {
      username: 'preferred_username',
      email: 'email',
      name: 'given_name'
    };

    this.oidcProvider = {
      providerName: settings.oidcProviderDetails?.providerName || '',
      clientId: settings.oidcProviderDetails?.clientId || '',
      issuerUri: settings.oidcProviderDetails?.issuerUri || '',
      claimMapping: settings.oidcProviderDetails?.claimMapping || defaultClaimMapping
    };

    this.availablePermissions.forEach(perm => {
      perm.selected = this.selectedPermissions.includes(perm.value);
    });
  }

  isOidcFormComplete(): boolean {
    const p = this.oidcProvider;
    return !!(p.providerName && p.clientId && p.issuerUri && p.claimMapping.name && p.claimMapping.email && p.claimMapping.username);
  }

  toggleOidcEnabled(): void {
    if (!this.isOidcFormComplete()) return;
    this.appSettingsService.toggleOidcEnabled(this.oidcEnabled).subscribe({
      next: () => this.messageService.add({
        severity: 'success',
        summary: this.translateService.instant('settings.authentication.toast.oidcUpdated.summary'),
        detail: this.translateService.instant('settings.authentication.toast.oidcUpdated.detail')
      }),
      error: () => this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('settings.authentication.toast.oidcUpdateFailed.summary'),
        detail: this.translateService.instant('settings.authentication.toast.oidcUpdateFailed.detail')
      })
    });
  }

  saveOidcProvider(): void {
    const payload = [
      {
        key: AppSettingKey.OIDC_PROVIDER_DETAILS,
        newValue: this.oidcProvider
      }
    ];
    this.appSettingsService.saveSettings(payload).subscribe({
      next: () => this.messageService.add({
        severity: 'success',
        summary: this.translateService.instant('settings.authentication.toast.oidcProviderSaved.summary'),
        detail: this.translateService.instant('settings.authentication.toast.oidcProviderSaved.detail')
      }),
      error: () => this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('settings.authentication.toast.oidcProviderSaveFailed.summary'),
        detail: this.translateService.instant('settings.authentication.toast.oidcProviderSaveFailed.detail')
      })
    });
  }

  saveOidcAutoProvisionSettings(): void {
    const provisionDetails = {
      enableAutoProvisioning: this.autoUserProvisioningEnabled,
      defaultPermissions: [
        'permissionRead',
        ...this.availablePermissions.filter(p => p.selected).map(p => p.value)
      ],
      defaultLibraryIds: this.editingLibraryIds
    };

    const payload = [
      {
        key: AppSettingKey.OIDC_AUTO_PROVISION_DETAILS,
        newValue: provisionDetails
      }
    ];

    this.appSettingsService.saveSettings(payload).subscribe({
      next: () => this.messageService.add({
        severity: 'success',
        summary: this.translateService.instant('settings.authentication.toast.oidcAutoProvisionSaved.summary'),
        detail: this.translateService.instant('settings.authentication.toast.oidcAutoProvisionSaved.detail')
      }),
      error: () => this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('settings.authentication.toast.oidcAutoProvisionSaveFailed.summary'),
        detail: this.translateService.instant('settings.authentication.toast.oidcAutoProvisionSaveFailed.detail')
      })
    });
  }
}
