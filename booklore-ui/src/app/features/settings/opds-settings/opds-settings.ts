import {Component, inject, OnDestroy, OnInit} from '@angular/core';

import {Button} from 'primeng/button';
import {InputText} from 'primeng/inputtext';
import {API_CONFIG} from '../../../core/config/api-config';
import {Tooltip} from 'primeng/tooltip';
import {TableModule} from 'primeng/table';
import {Dialog} from 'primeng/dialog';
import {FormsModule} from '@angular/forms';
import {ConfirmDialog} from 'primeng/confirmdialog';
import {ConfirmationService, MessageService} from 'primeng/api';
import {OpdsService, OpdsSortOrder, OpdsUserV2, OpdsUserV2CreateRequest} from './opds.service';
import {catchError, filter, take, takeUntil, tap} from 'rxjs/operators';
import {UserService} from '../user-management/user.service';
import {of, Subject} from 'rxjs';
import {Password} from 'primeng/password';
import {ToggleSwitch} from 'primeng/toggleswitch';
import {AppSettingsService} from '../../../shared/service/app-settings.service';
import {AppSettingKey} from '../../../shared/model/app-settings.model';
import {ExternalDocLinkComponent} from '../../../shared/components/external-doc-link/external-doc-link.component';
import {Select} from 'primeng/select';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-opds-settings',
  imports: [
    Button,
    InputText,
    Tooltip,
    Dialog,
    FormsModule,
    ConfirmDialog,
    TableModule,
    Password,
    ToggleSwitch,
    ExternalDocLinkComponent,
    Select,
    TranslateModule
],
  providers: [ConfirmationService],
  templateUrl: './opds-settings.html',
  styleUrl: './opds-settings.scss'
})
export class OpdsSettings implements OnInit, OnDestroy {

  opdsEndpoint = `${API_CONFIG.BASE_URL}/api/v1/opds`;
  opdsEnabled = false;

  private opdsService = inject(OpdsService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private userService = inject(UserService);
  private appSettingsService = inject(AppSettingsService);
  private translateService = inject(TranslateService);

  users: OpdsUserV2[] = [];
  loading = false;
  showCreateUserDialog = false;
  newUser: OpdsUserV2CreateRequest = {username: '', password: '', sortOrder: 'RECENT'};
  passwordVisibility: boolean[] = [];
  hasPermission = false;

  editingUserId: number | null = null;
  editingSortOrder: OpdsSortOrder | null = null;

  private readonly destroy$ = new Subject<void>();
  dummyPassword: string = "***********************";

  sortOrderOptions: Array<{ label: string; value: OpdsSortOrder }> = [];

  ngOnInit(): void {
    this.loading = true;
    this.refreshSortOrderOptions();
    this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.refreshSortOrderOptions();
    });

    let prevHasPermission = false;
    this.userService.userState$.pipe(
      filter(state => !!state?.user && state.loaded),
      takeUntil(this.destroy$),
      tap(state => {
        this.hasPermission = !!(state.user?.permissions.canAccessOpds || state.user?.permissions.admin);
      }),
      filter(() => {
        const shouldRun = this.hasPermission && !prevHasPermission;
        prevHasPermission = this.hasPermission;
        return shouldRun;
      }),
      tap(() => this.loadAppSettings())
    ).subscribe();
  }

  private loadAppSettings(): void {
    this.appSettingsService.appSettings$
      .pipe(
        filter((settings): settings is NonNullable<typeof settings> => settings != null),
        take(1)
      )
      .subscribe(settings => {
        this.opdsEnabled = settings.opdsServerEnabled ?? false;
        if (this.opdsEnabled) {
          this.loadUsers();
        } else {
          this.loading = false;
        }
      });
  }

  private loadUsers(): void {
    this.opdsService.getUser().pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Error loading users:', err);
        this.showMessage('error', 'settings.opds.toast.loadUsersError.summary', 'settings.opds.toast.loadUsersError.detail');
        return of([]);
      })
    ).subscribe(users => {
      this.users = users;
      this.passwordVisibility = new Array(users.length).fill(false);
      this.loading = false;
    });
  }

  createUser(): void {
    if (!this.newUser.username || !this.newUser.password) return;

    this.opdsService.createUser(this.newUser).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: user => {
        this.users.push(user);
        this.resetCreateUserDialog();
        this.showMessage('success', 'settings.opds.toast.userCreated.summary', 'settings.opds.toast.userCreated.detail');
      },
      error: err => {
        console.error('Error creating user:', err);
        const message = err?.error?.message;
        if (message) {
          this.showMessage('error', 'settings.opds.toast.createUserError.summary', message);
        } else {
          this.showMessage('error', 'settings.opds.toast.createUserError.summary', 'settings.opds.toast.createUserError.detail');
        }
      }
    });
  }

  confirmDelete(user: OpdsUserV2): void {
    this.confirmationService.confirm({
      message: this.translateService.instant('settings.opds.confirm.deleteUser.message', { username: user.username }),
      header: this.translateService.instant('settings.opds.confirm.deleteUser.header'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: this.translateService.instant('common.delete'),
      rejectLabel: this.translateService.instant('common.cancel'),
      accept: () => this.deleteUser(user)
    });
  }

  deleteUser(user: OpdsUserV2): void {
    if (!user.id) return;

    this.opdsService.deleteCredential(user.id).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Error deleting user:', err);
        this.showMessage('error', 'settings.opds.toast.deleteUserError.summary', 'settings.opds.toast.deleteUserError.detail');
        return of(null);
      })
    ).subscribe(() => {
      this.users = this.users.filter(u => u.id !== user.id);
      this.showMessage('success', 'settings.opds.toast.userDeleted.summary', 'settings.opds.toast.userDeleted.detail');
    });
  }

  cancelCreateUser(): void {
    this.resetCreateUserDialog();
  }

  copyEndpoint(): void {
    navigator.clipboard.writeText(this.opdsEndpoint).then(() => {
      this.showMessage('success', 'settings.opds.toast.endpointCopied.summary', 'settings.opds.toast.endpointCopied.detail');
    });
  }

  toggleOpdsServer(): void {
    this.saveSetting(AppSettingKey.OPDS_SERVER_ENABLED, this.opdsEnabled);
    if (this.opdsEnabled) {
      this.loadUsers();
    } else {
      this.users = [];
    }
  }

  private saveSetting(key: string, value: unknown): void {
    this.appSettingsService.saveSettings([{key, newValue: value}]).subscribe({
      next: () => {
        this.showMessage(
          'success',
          'settings.toast.saved.summary',
          value === true ? 'settings.opds.toast.serverEnabled.detail' : 'settings.opds.toast.serverDisabled.detail'
        );
      },
      error: () => {
        this.showMessage('error', 'settings.toast.saveError.summary', 'settings.toast.saveError.detail');
      }
    });
  }

  private resetCreateUserDialog(): void {
    this.showCreateUserDialog = false;
    this.newUser = {username: '', password: '', sortOrder: 'RECENT'};
  }

  private showMessage(
    severity: string,
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

  getSortOrderLabel(sortOrder?: OpdsSortOrder): string {
    const resolved = sortOrder ?? 'RECENT';
    const option = this.sortOrderOptions.find(o => o.value === resolved);
    return option?.label ?? this.translateService.instant('settings.opds.sortOrder.recent');
  }

  startEdit(user: OpdsUserV2): void {
    this.editingUserId = user.id;
    this.editingSortOrder = user.sortOrder || 'RECENT';
  }

  cancelEdit(): void {
    this.editingUserId = null;
    this.editingSortOrder = null;
  }

  saveSortOrder(user: OpdsUserV2): void {
    if (!this.editingSortOrder || !user.id) return;

    this.opdsService.updateUser(user.id, this.editingSortOrder).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Error updating sort order:', err);
        this.showMessage(
          'error',
          'settings.opds.toast.updateSortOrderError.summary',
          'settings.opds.toast.updateSortOrderError.detail'
        );
        return of(null);
      })
    ).subscribe(updatedUser => {
      if (updatedUser) {
        const index = this.users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          this.users[index] = updatedUser;
        }
        this.showMessage(
          'success',
          'settings.opds.toast.sortOrderUpdated.summary',
          'settings.opds.toast.sortOrderUpdated.detail'
        );
      }
      this.cancelEdit();
    });
  }

  private refreshSortOrderOptions(): void {
    this.sortOrderOptions = [
      { label: this.translateService.instant('settings.opds.sortOrder.recent'), value: 'RECENT' },
      { label: this.translateService.instant('settings.opds.sortOrder.titleAsc'), value: 'TITLE_ASC' },
      { label: this.translateService.instant('settings.opds.sortOrder.titleDesc'), value: 'TITLE_DESC' },
      { label: this.translateService.instant('settings.opds.sortOrder.authorAsc'), value: 'AUTHOR_ASC' },
      { label: this.translateService.instant('settings.opds.sortOrder.authorDesc'), value: 'AUTHOR_DESC' },
      { label: this.translateService.instant('settings.opds.sortOrder.seriesAsc'), value: 'SERIES_ASC' },
      { label: this.translateService.instant('settings.opds.sortOrder.seriesDesc'), value: 'SERIES_DESC' },
      { label: this.translateService.instant('settings.opds.sortOrder.ratingAsc'), value: 'RATING_ASC' },
      { label: this.translateService.instant('settings.opds.sortOrder.ratingDesc'), value: 'RATING_DESC' }
    ];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
