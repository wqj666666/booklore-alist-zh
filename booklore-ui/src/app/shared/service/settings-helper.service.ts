import {Injectable, inject} from '@angular/core';
import {AppSettingsService} from './app-settings.service';
import {MessageService} from 'primeng/api';
import {Observable} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class SettingsHelperService {

  private readonly appSettingsService = inject(AppSettingsService);
  private readonly messageService = inject(MessageService);
  private readonly translateService = inject(TranslateService);

  saveSetting(key: string, value: unknown): Observable<void> {
    const observable = this.appSettingsService.saveSettings([{key, newValue: value}]);

    observable.subscribe({
      next: () => this.showSuccessMessage(),
      error: (error) => {
        console.error('Failed to save setting:', error);
        this.showErrorMessage();
      }
    });

    return observable;
  }

  private showSuccessMessage(): void {
    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('settings.toast.saved.summary'),
      detail: this.translateService.instant('settings.toast.saved.detail')
    });
  }

  private showErrorMessage(): void {
    this.messageService.add({
      severity: 'error',
      summary: this.translateService.instant('settings.toast.saveError.summary'),
      detail: this.translateService.instant('settings.toast.saveError.detail')
    });
  }

  showMessage(severity: 'success' | 'error', summary: string, detail: string): void {
    this.messageService.add({severity, summary, detail});
  }
}

