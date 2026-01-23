import {Component, inject, OnInit} from '@angular/core';
import {Button} from 'primeng/button';
import {Checkbox} from 'primeng/checkbox';
import {MessageService, PrimeTemplate} from 'primeng/api';
import {RadioButton} from 'primeng/radiobutton';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {TableModule} from 'primeng/table';
import {Tooltip} from 'primeng/tooltip';
import {DynamicDialogRef} from 'primeng/dynamicdialog';
import {EmailV2ProviderService} from './email-v2-provider.service';
import {EmailProvider} from '../email-provider.model';
import {UserService} from '../../user-management/user.service';
import {DialogLauncherService} from '../../../../shared/services/dialog-launcher.service';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-email-v2-provider',
  imports: [
    Button,
    Checkbox,
    PrimeTemplate,
    RadioButton,
    ReactiveFormsModule,
    TableModule,
    Tooltip,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './email-v2-provider.component.html',
  styleUrl: './email-v2-provider.component.scss'
})
export class EmailV2ProviderComponent implements OnInit {
  emailProviders: EmailProvider[] = [];
  editingProviderIds: number[] = [];
  ref: DynamicDialogRef | undefined | null;
  private dialogLauncherService = inject(DialogLauncherService);
  private emailProvidersService = inject(EmailV2ProviderService);
  private messageService = inject(MessageService);
  private userService = inject(UserService);
  private translateService = inject(TranslateService);
  defaultProviderId: unknown;
  currentUserId: number | null = null;
  isAdmin: boolean = false;

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadEmailProviders();
  }

  loadCurrentUser(): void {
    const currentUser = this.userService.getCurrentUser();
    this.currentUserId = currentUser?.id ?? null;
    this.isAdmin = currentUser?.permissions.admin ?? false;
  }

  loadEmailProviders(): void {
    this.emailProvidersService.getEmailProviders().subscribe({
      next: (emailProviders: EmailProvider[]) => {
        this.emailProviders = emailProviders.map((provider) => ({
          ...provider,
          isEditing: false,
        }));
        const defaultProvider = emailProviders.find((provider) => provider.defaultProvider);
        this.defaultProviderId = defaultProvider ? defaultProvider.id : null;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('settings.emailV2.provider.toast.loadError.summary'),
          detail: this.translateService.instant('settings.emailV2.provider.toast.loadError.detail'),
        });
      },
    });
  }

  toggleEdit(provider: EmailProvider): void {
    provider.isEditing = !provider.isEditing;
    if (provider.isEditing) {
      this.editingProviderIds.push(provider.id);
    } else {
      this.editingProviderIds = this.editingProviderIds.filter((id) => id !== provider.id);
    }
  }

  saveProvider(provider: EmailProvider): void {
    this.emailProvidersService.updateProvider(provider).subscribe({
      next: () => {
        provider.isEditing = false;
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('settings.emailV2.provider.toast.updateSuccess.summary'),
          detail: this.translateService.instant('settings.emailV2.provider.toast.updateSuccess.detail'),
        });
        this.loadEmailProviders();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('settings.emailV2.provider.toast.updateError.summary'),
          detail: this.translateService.instant('settings.emailV2.provider.toast.updateError.detail'),
        });
      },
    });
  }

  deleteProvider(provider: EmailProvider): void {
    if (confirm(this.translateService.instant('settings.emailV2.provider.confirmDelete', {name: provider.name}))) {
      this.emailProvidersService.deleteProvider(provider.id).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('settings.emailV2.provider.toast.deleteSuccess.summary'),
            detail: this.translateService.instant('settings.emailV2.provider.toast.deleteSuccess.detail', {name: provider.name}),
          });
          this.loadEmailProviders();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('settings.emailV2.provider.toast.deleteError.summary'),
            detail: this.translateService.instant('settings.emailV2.provider.toast.deleteError.detail'),
          });
        },
      });
    }
  }

  openCreateProviderDialog() {
    this.ref = this.dialogLauncherService.openEmailProviderDialog();
    this.ref?.onClose.subscribe((result) => {
      if (result) {
        this.loadEmailProviders();
      }
    });
  }

  setDefaultProvider(provider: EmailProvider) {
    this.emailProvidersService.setDefaultProvider(provider.id).subscribe({
      next: () => {
        this.defaultProviderId = provider.id;
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('settings.emailV2.provider.toast.defaultSetSuccess.summary'),
          detail: this.translateService.instant('settings.emailV2.provider.toast.defaultSetSuccess.detail', {name: provider.name})
        });
      },
      error: (err) => {
        console.error('Failed to set default provider', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('settings.emailV2.provider.toast.defaultSetError.summary'),
          detail: this.translateService.instant('settings.emailV2.provider.toast.defaultSetError.detail', {name: provider.name})
        });
      }
    });
  }

  canModifyProvider(provider: EmailProvider): boolean {
    return !provider.shared || provider.userId === this.currentUserId;
  }

  toggleShared(provider: EmailProvider): void {
    this.emailProvidersService.updateProvider(provider).subscribe({
      next: () => {
        const sharedStateKey = provider.shared
          ? 'settings.emailV2.provider.sharedState.shared'
          : 'settings.emailV2.provider.sharedState.notShared';
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('settings.emailV2.provider.toast.sharedUpdateSuccess.summary'),
          detail: this.translateService.instant('settings.emailV2.provider.toast.sharedUpdateSuccess.detail', {
            name: provider.name,
            state: this.translateService.instant(sharedStateKey)
          }),
        });
      },
      error: () => {
        provider.shared = !provider.shared;
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('settings.emailV2.provider.toast.sharedUpdateError.summary'),
          detail: this.translateService.instant('settings.emailV2.provider.toast.sharedUpdateError.detail'),
        });
      },
    });
  }
}
