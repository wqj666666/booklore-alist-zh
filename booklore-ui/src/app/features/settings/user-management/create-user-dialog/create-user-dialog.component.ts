import {Component, inject, OnInit} from '@angular/core';
import {InputText} from 'primeng/inputtext';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Checkbox} from 'primeng/checkbox';
import {MultiSelectModule} from 'primeng/multiselect';
import {Library} from '../../../book/model/library.model';
import {Button} from 'primeng/button';
import {LibraryService} from '../../../book/service/library.service';
import {UserService} from '../user.service';
import {MessageService} from 'primeng/api';
import {DynamicDialogRef} from 'primeng/dynamicdialog';
import {TranslateModule, TranslateService} from '@ngx-translate/core';


@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  imports: [
    InputText,
    ReactiveFormsModule,
    FormsModule,
    Checkbox,
    MultiSelectModule,
    Button,
    TranslateModule
  ],
  templateUrl: './create-user-dialog.component.html',
  styleUrl: './create-user-dialog.component.scss'
})
export class CreateUserDialogComponent implements OnInit {
  userForm!: FormGroup;
  libraries: Library[] = [];

  private fb = inject(FormBuilder);
  private libraryService = inject(LibraryService);
  private userService = inject(UserService);
  private messageService = inject(MessageService);
  private ref = inject(DynamicDialogRef);
  private translateService = inject(TranslateService);

  ngOnInit() {
    this.libraries = this.libraryService.getLibrariesFromState();

    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      selectedLibraries: [[], Validators.required],
      permissionUpload: [false],
      permissionDownload: [false],
      permissionEditMetadata: [false],
      permissionManipulateLibrary: [false],
      permissionEmailBook: [false],
      permissionDeleteBook: [false],
      permissionAccessOpds: [false],
      permissionSyncKoreader: [false],
      permissionSyncKobo: [false],
      permissionManageMetadataConfig: [false],
      permissionAccessBookdrop: [false],
      permissionAccessLibraryStats: [false],
      permissionAccessUserStats: [false],
      permissionAccessTaskManager: [false],
      permissionManageEmailConfig: [false],
      permissionManageGlobalPreferences: [false],
      permissionManageIcons: [false],
      permissionManageFonts: [false],
      permissionAdmin: [false],
      permissionBulkAutoFetchMetadata: [false],
      permissionBulkCustomFetchMetadata: [false],
      permissionBulkEditMetadata: [false],
      permissionBulkRegenerateCover: [false],
      permissionMoveOrganizeFiles: [false],
      permissionBulkLockUnlockMetadata: [false],
      permissionBulkResetBookloreReadProgress: [false],
      permissionBulkResetKoReaderReadProgress: [false],
      permissionBulkResetBookReadStatus: [false],
    });

    this.userForm.get('permissionAdmin')?.valueChanges.subscribe((isAdmin: boolean) => {
      const controls = this.userForm.controls;
      Object.keys(controls).forEach(key => {
        if (key !== 'permissionAdmin' && key.startsWith('permission')) {
          controls[key].setValue(isAdmin, {emitEvent: false});
        }
      });
    });
  }

  createUser() {
    if (this.userForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('settings.userManagement.createUserDialog.toast.validationError.summary'),
        detail: this.translateService.instant('settings.userManagement.createUserDialog.toast.validationError.detail')
      });
      return;
    }

    const userData = {
      ...this.userForm.value,
      selectedLibraries: this.userForm.value.selectedLibraries.map((lib: Library) => lib.id)
    };

    this.userService.createUser(userData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('settings.userManagement.createUserDialog.toast.userCreated.summary'),
          detail: this.translateService.instant('settings.userManagement.createUserDialog.toast.userCreated.detail')
        });
        this.ref.close(true);
      },
      error: (err) => {
        const backendMessage = err?.error?.message;
        const detail = backendMessage
          ? this.translateService.instant('settings.userManagement.createUserDialog.toast.userCreateFailed.detailWithMessage', {message: backendMessage})
          : this.translateService.instant('settings.userManagement.createUserDialog.toast.userCreateFailed.detail');
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('settings.userManagement.createUserDialog.toast.userCreateFailed.summary'),
          detail
        });
      }
    });
  }

  closeDialog(): void {
    this.ref.close();
  }
}
