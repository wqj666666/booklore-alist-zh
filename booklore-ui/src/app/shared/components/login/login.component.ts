import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from '../../service/auth.service';
import {Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {Password} from 'primeng/password';
import {Button} from 'primeng/button';
import {Message} from 'primeng/message';
import {InputText} from 'primeng/inputtext';
import {OAuthService} from 'angular-oauth2-oidc';
import {Observable, Subject} from 'rxjs';
import {filter, take, takeUntil} from 'rxjs/operators';
import {getOidcErrorCount, isOidcBypassed, resetOidcBypass} from '../../../core/security/auth-initializer';
import {AppSettingsService, PublicAppSettings} from '../../service/app-settings.service';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    Password,
    Button,
    Message,
    InputText,
    TranslateModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  username = '';
  password = '';
  errorMessage = '';
  oidcEnabled = false;
  oidcName = 'OIDC';
  isOidcBypassed = false;
  showOidcBypassInfo = false;
  oidcBypassMessage = '';
  isOidcLoginInProgress = false;

  private authService = inject(AuthService);
  private oAuthService = inject(OAuthService);
  private appSettingsService = inject(AppSettingsService);
  private router = inject(Router);
  private translateService = inject(TranslateService);

  publicAppSettings$: Observable<PublicAppSettings | null> = this.appSettingsService.publicAppSettings$;

  private destroy$ = new Subject<void>();
  private errorMessageKey: string | null = null;
  private errorMessageParams: Record<string, unknown> | undefined;
  private oidcBypassMessageKey: string | null = null;
  private oidcBypassMessageParams: Record<string, unknown> | undefined;

  ngOnInit(): void {
    this.publicAppSettings$
      .pipe(
        filter(settings => settings != null),
        take(1)
      )
      .subscribe(publicSettings => {
        this.oidcEnabled = publicSettings!.oidcEnabled;
        this.oidcName = publicSettings!.oidcProviderDetails?.providerName || 'OIDC';
        this.checkOidcBypassStatus();
      });

    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.oidcBypassMessageKey) {
          this.oidcBypassMessage = this.translateService.instant(this.oidcBypassMessageKey, this.oidcBypassMessageParams);
        }
        if (this.errorMessageKey) {
          this.errorMessage = this.translateService.instant(this.errorMessageKey, this.errorMessageParams);
        }
      });
  }

  private checkOidcBypassStatus(): void {
    this.isOidcBypassed = isOidcBypassed();
    const errorCount = getOidcErrorCount();

    if (this.oidcEnabled && (this.isOidcBypassed || errorCount > 0)) {
      this.showOidcBypassInfo = true;

      if (this.isOidcBypassed && errorCount >= 3) {
        this.setOidcBypassMessage('auth.login.oidcWarning.autoDisabledAfterFailures', {provider: this.oidcName, errorCount});
      } else if (this.isOidcBypassed) {
        this.setOidcBypassMessage('auth.login.oidcWarning.manuallyDisabled', {provider: this.oidcName});
      } else if (errorCount > 0) {
        this.setOidcBypassMessage('auth.login.oidcWarning.encounteredErrors', {provider: this.oidcName, errorCount});
      }
    } else {
      this.showOidcBypassInfo = false;
      this.oidcBypassMessage = '';
      this.oidcBypassMessageKey = null;
      this.oidcBypassMessageParams = undefined;
    }
  }

  login(): void {
    this.authService.internalLogin({username: this.username, password: this.password}).subscribe({
      next: (response) => {
        if (response.isDefaultPassword === 'true') {
          this.router.navigate(['/change-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        if (error.status === 0) {
          this.setErrorMessage('auth.login.errors.cannotConnect');
        } else {
          const backendMessage = error?.error?.message;
          if (backendMessage) {
            this.errorMessage = backendMessage;
            this.errorMessageKey = null;
            this.errorMessageParams = undefined;
          } else {
            this.setErrorMessage('auth.login.errors.unexpected');
          }
        }
      }
    });
  }

  loginWithOidc(): void {
    if (this.isOidcLoginInProgress) {
      return;
    }

    this.isOidcLoginInProgress = true;
    this.errorMessage = '';
    this.errorMessageKey = null;
    this.errorMessageParams = undefined;

    try {
      setTimeout(() => {
        this.isOidcLoginInProgress = false;
      }, 5000);
      this.oAuthService.initCodeFlow();
    } catch (error) {
      console.error('OIDC login initiation failed:', error);
      this.setErrorMessage('auth.login.errors.oidcInitiationFailed');
      this.isOidcLoginInProgress = false;
    }
  }

  bypassOidc(): void {
    localStorage.setItem('booklore-oidc-bypass', 'true');
    this.isOidcBypassed = true;
    this.showOidcBypassInfo = false;
  }

  enableOidc(): void {
    resetOidcBypass();
    this.isOidcBypassed = false;
    this.showOidcBypassInfo = false;
    this.isOidcLoginInProgress = false;
    window.location.reload();
  }

  retryOidc(): void {
    resetOidcBypass();
    this.isOidcBypassed = false;
    this.showOidcBypassInfo = false;
    this.isOidcLoginInProgress = false;
    window.location.reload();
  }

  dismissOidcWarning(): void {
    this.showOidcBypassInfo = false;
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

  private setOidcBypassMessage(key: string, params?: Record<string, unknown>): void {
    this.oidcBypassMessageKey = key;
    this.oidcBypassMessageParams = params;
    this.oidcBypassMessage = this.translateService.instant(key, params);
  }
}
