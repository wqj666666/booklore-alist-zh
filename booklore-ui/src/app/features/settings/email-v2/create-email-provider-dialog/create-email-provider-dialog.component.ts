import {Component, inject, OnInit} from '@angular/core';
import {Button} from 'primeng/button';
import {Checkbox} from 'primeng/checkbox';
import {InputText} from 'primeng/inputtext';

import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MessageService} from 'primeng/api';
import {DynamicDialogRef} from 'primeng/dynamicdialog';
import {EmailV2ProviderService} from '../email-v2-provider/email-v2-provider.service';
import {Tooltip} from 'primeng/tooltip';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-create-email-provider-dialog',
  imports: [
    Button,
    Checkbox,
    InputText,
    ReactiveFormsModule,
    Tooltip,
    TranslateModule
  ],
  templateUrl: './create-email-provider-dialog.component.html',
  styleUrl: './create-email-provider-dialog.component.scss'
})
export class CreateEmailProviderDialogComponent implements OnInit {
  emailProviderForm!: FormGroup;

  private fb = inject(FormBuilder);
  private emailProviderService = inject(EmailV2ProviderService);
  private messageService = inject(MessageService);
  private ref = inject(DynamicDialogRef);
  private translateService = inject(TranslateService);

  ngOnInit() {
    this.emailProviderForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      host: ['', Validators.required],
      port: [null, [Validators.required, Validators.min(1)]],
      username: [''],
      password: [''],
      fromAddress: ['', [Validators.email]],
      auth: [false],
      startTls: [false]
    });
  }

  createEmailProvider() {
    if (this.emailProviderForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('settings.emailV2.createProviderDialog.toast.validationError.summary'),
        detail: this.translateService.instant('settings.emailV2.createProviderDialog.toast.validationError.detail')
      });
      return;
    }

    const emailProviderData = this.emailProviderForm.value;

    this.emailProviderService.createEmailProvider(emailProviderData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('settings.emailV2.createProviderDialog.toast.createSuccess.summary'),
          detail: this.translateService.instant('settings.emailV2.createProviderDialog.toast.createSuccess.detail')
        });
        this.ref.close(true);
      },
      error: (err) => {
        const serverMessage = err?.error?.message;
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('settings.emailV2.createProviderDialog.toast.createError.summary'),
          detail: serverMessage
            ? this.translateService.instant('settings.emailV2.createProviderDialog.toast.createErrorWithMessage.detail', {message: serverMessage})
            : this.translateService.instant('settings.emailV2.createProviderDialog.toast.createError.detail')
        });
      }
    });
  }

  closeDialog(): void {
    this.ref.close();
  }
}
