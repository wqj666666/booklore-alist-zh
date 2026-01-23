import {Component, inject, OnDestroy} from '@angular/core';
import {Button} from 'primeng/button';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Message} from 'primeng/message';

import {Password} from 'primeng/password';
import {MessageService} from 'primeng/api';
import {UserService} from '../../../features/settings/user-management/user.service';
import {AuthService} from '../../service/auth.service';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    Button,
    FormsModule,
    Message,
    Password,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent implements OnDestroy {
  currentPassword: string = '';
  newPassword: string = '';
  confirmNewPassword: string = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;

  protected userService = inject(UserService);
  protected authService = inject(AuthService);
  protected messageService = inject(MessageService);
  private translateService = inject(TranslateService);

  private destroy$ = new Subject<void>();
  private errorMessageKey: string | null = null;
  private errorMessageParams: Record<string, unknown> | undefined;
  private successMessageKey: string | null = null;
  private successMessageParams: Record<string, unknown> | undefined;

  constructor() {
    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.errorMessageKey) {
          this.errorMessage = this.translateService.instant(this.errorMessageKey, this.errorMessageParams);
        }
        if (this.successMessageKey) {
          this.successMessage = this.translateService.instant(this.successMessageKey, this.successMessageParams);
        }
      });
  }

  get passwordsMatch(): boolean {
    return this.newPassword === this.confirmNewPassword;
  }

  changePassword() {
    this.errorMessage = null;
    this.successMessage = null;
    this.errorMessageKey = null;
    this.errorMessageParams = undefined;
    this.successMessageKey = null;
    this.successMessageParams = undefined;

    if (!this.currentPassword || !this.newPassword || !this.confirmNewPassword) {
      this.setErrorMessage('auth.changePassword.errors.allFieldsRequired');
      return;
    }

    if (!this.passwordsMatch) {
      this.setErrorMessage('auth.changePassword.errors.newPasswordsDoNotMatch');
      return;
    }

    if (this.currentPassword === this.newPassword) {
      this.setErrorMessage('auth.changePassword.errors.newPasswordSameAsCurrent');
      return;
    }

    this.userService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.setSuccessMessage('auth.changePassword.success.passwordChanged');
        this.logout();
      },
      error: (err) => {
        this.errorMessage = err.message;
        this.errorMessageKey = null;
        this.errorMessageParams = undefined;
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('auth.changePassword.toast.failedSummary'),
          detail: this.errorMessage ?? this.translateService.instant('auth.changePassword.toast.unknownError')
        });
      }
    });
  }

  logout() {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setErrorMessage(key: string, params?: Record<string, unknown>): void {
    this.errorMessageKey = key;
    this.errorMessageParams = params;
    this.errorMessage = this.translateService.instant(key, params);
  }

  private setSuccessMessage(key: string, params?: Record<string, unknown>): void {
    this.successMessageKey = key;
    this.successMessageParams = params;
    this.successMessage = this.translateService.instant(key, params);
  }
}
