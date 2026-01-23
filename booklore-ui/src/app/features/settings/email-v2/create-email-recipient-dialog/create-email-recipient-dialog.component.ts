import {Component, inject} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MessageService} from 'primeng/api';
import {DynamicDialogRef} from 'primeng/dynamicdialog';
import {Checkbox} from 'primeng/checkbox';
import {Button} from 'primeng/button';
import {InputText} from 'primeng/inputtext';
import {EmailV2RecipientService} from '../email-v2-recipient/email-v2-recipient.service';
import {Tooltip} from 'primeng/tooltip';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-create-email-recipient-dialog',
  imports: [
    Checkbox,
    ReactiveFormsModule,
    Button,
    InputText,
    Tooltip,
    TranslateModule
  ],
  templateUrl: './create-email-recipient-dialog.component.html',
  styleUrls: ['./create-email-recipient-dialog.component.scss']
})
export class CreateEmailRecipientDialogComponent {
  emailRecipientForm: FormGroup;
  private fb = inject(FormBuilder);
  private emailRecipientService = inject(EmailV2RecipientService);
  private messageService = inject(MessageService);
  private ref = inject(DynamicDialogRef);
  private translateService = inject(TranslateService);

  constructor() {
    this.emailRecipientForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      defaultRecipient: [false]
    });
  }

  closeDialog(): void {
    this.ref.close();
  }

  createEmailRecipient(): void {
    if (this.emailRecipientForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('settings.emailV2.createRecipientDialog.toast.validationError.summary'),
        detail: this.translateService.instant('settings.emailV2.createRecipientDialog.toast.validationError.detail')
      });
      return;
    }

    const emailRecipientData = this.emailRecipientForm.value;

    this.emailRecipientService.createRecipient(emailRecipientData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('settings.emailV2.createRecipientDialog.toast.createSuccess.summary'),
          detail: this.translateService.instant('settings.emailV2.createRecipientDialog.toast.createSuccess.detail', {name: emailRecipientData.name})
        });
        this.ref.close(true);
      },
      error: (err) => {
        const serverMessage = err?.error?.message;
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('settings.emailV2.createRecipientDialog.toast.createError.summary'),
          detail: serverMessage
            ? this.translateService.instant('settings.emailV2.createRecipientDialog.toast.createErrorWithMessage.detail', {message: serverMessage})
            : this.translateService.instant('settings.emailV2.createRecipientDialog.toast.createError.detail')
        });
      }
    });
  }
}
