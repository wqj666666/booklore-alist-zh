import {inject, Injectable} from '@angular/core';
import {ConfirmationService, MenuItem, MessageService} from 'primeng/api';
import {Router} from '@angular/router';
import {LibraryService} from './library.service';
import {ShelfService} from './shelf.service';
import {Library} from '../model/library.model';
import {Shelf} from '../model/shelf.model';
import {MetadataRefreshType} from '../../metadata/model/request/metadata-refresh-type.enum';
import {MagicShelf, MagicShelfService} from '../../magic-shelf/service/magic-shelf.service';
import {TaskHelperService} from '../../settings/task-management/task-helper.service';
import {UserService} from "../../settings/user-management/user.service";
import {LoadingService} from '../../../core/services/loading.service';
import {finalize} from 'rxjs';
import {DialogLauncherService} from '../../../shared/services/dialog-launcher.service';
import {TranslateService} from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class LibraryShelfMenuService {

  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private libraryService = inject(LibraryService);
  private shelfService = inject(ShelfService);
  private taskHelperService = inject(TaskHelperService);
  private router = inject(Router);
  private dialogLauncherService = inject(DialogLauncherService);
  private magicShelfService = inject(MagicShelfService);
  private userService = inject(UserService);
  private loadingService = inject(LoadingService);
  private translateService = inject(TranslateService);

  initializeLibraryMenuItems(entity: Library | Shelf | MagicShelf | null): MenuItem[] {
    return [
      {
        label: this.translateService.instant('book.browser.entityMenu.options'),
        items: [
          {
            label: this.translateService.instant('book.browser.entityMenu.library.edit'),
            icon: 'pi pi-pen-to-square',
            command: () => {
              this.dialogLauncherService.openLibraryEditDialog((entity?.id as number));
            }
          },
          {
            label: this.translateService.instant('book.browser.entityMenu.library.rescan.label'),
            icon: 'pi pi-refresh',
            command: () => {
              this.confirmationService.confirm({
                message: this.translateService.instant('book.browser.entityMenu.library.rescan.confirmMessage', {name: entity?.name}),
                header: this.translateService.instant('common.confirm'),
                rejectButtonProps: {
                  label: this.translateService.instant('common.cancel'),
                  severity: 'secondary',
                },
                acceptButtonProps: {
                  label: this.translateService.instant('common.yes'),
                  severity: 'success',
                },
                accept: () => {
                  this.libraryService.refreshLibrary(entity?.id!).subscribe({
                    complete: () => {
                      this.messageService.add({
                        severity: 'info',
                        summary: this.translateService.instant('book.browser.entityMenu.toast.success.summary'),
                        detail: this.translateService.instant('book.browser.entityMenu.library.rescan.toast.scheduled')
                      });
                    },
                    error: () => {
                      this.messageService.add({
                        severity: 'error',
                        summary: this.translateService.instant('book.browser.entityMenu.toast.failed.summary'),
                        detail: this.translateService.instant('book.browser.entityMenu.library.rescan.toast.failed'),
                      });
                    }
                  });
                }
              });
            }
          },
          {
            label: this.translateService.instant('book.browser.entityMenu.library.customFetchMetadata'),
            icon: 'pi pi-sync',
            command: () => {
              this.dialogLauncherService.openLibraryMetadataFetchDialog((entity?.id as number));
            }
          },
          {
            label: this.translateService.instant('book.browser.entityMenu.library.autoFetchMetadata'),
            icon: 'pi pi-bolt',
            command: () => {
              this.taskHelperService.refreshMetadataTask({
                refreshType: MetadataRefreshType.LIBRARY,
                libraryId: entity?.id ?? undefined
              }).subscribe();
            }
          },
          {
            separator: true
          },
          {
            label: this.translateService.instant('book.browser.entityMenu.library.delete.label'),
            icon: 'pi pi-trash',
            command: () => {
              this.confirmationService.confirm({
                message: this.translateService.instant('book.browser.entityMenu.library.delete.confirmMessage', {name: entity?.name}),
                header: this.translateService.instant('common.confirm'),
                rejectButtonProps: {
                  label: this.translateService.instant('common.cancel'),
                  severity: 'secondary',
                },
                acceptButtonProps: {
                  label: this.translateService.instant('common.yes'),
                  severity: 'danger',
                },
                accept: () => {
                  const loader = this.loadingService.show(
                    this.translateService.instant('book.browser.entityMenu.library.delete.deleting', {name: entity?.name})
                  );

                  this.libraryService.deleteLibrary(entity?.id!)
                    .pipe(finalize(() => this.loadingService.hide(loader)))
                    .subscribe({
                      complete: () => {
                        this.router.navigate(['/']);
                        this.messageService.add({
                          severity: 'info',
                          summary: this.translateService.instant('book.browser.entityMenu.toast.success.summary'),
                          detail: this.translateService.instant('book.browser.entityMenu.library.delete.toast.deleted')
                        });
                      },
                      error: () => {
                        this.messageService.add({
                          severity: 'error',
                          summary: this.translateService.instant('book.browser.entityMenu.toast.failed.summary'),
                          detail: this.translateService.instant('book.browser.entityMenu.library.delete.toast.failed'),
                        });
                      }
                    });
                }
              });
            }
          }
        ]
      }
    ];
  }

  initializeShelfMenuItems(entity: Shelf | null): MenuItem[] {
    return [
      {
        label: this.translateService.instant('book.browser.entityMenu.options'),
        items: [
          {
            label: this.translateService.instant('book.browser.entityMenu.shelf.edit'),
            icon: 'pi pi-pen-to-square',
            command: () => {
              this.dialogLauncherService.openShelfEditDialog((entity?.id as number));
            }
          },
          {
            separator: true
          },
          {
            label: this.translateService.instant('book.browser.entityMenu.shelf.delete.label'),
            icon: 'pi pi-trash',
            command: () => {
              this.confirmationService.confirm({
                message: this.translateService.instant('book.browser.entityMenu.shelf.delete.confirmMessage', {name: entity?.name}),
                header: this.translateService.instant('common.confirm'),
                rejectButtonProps: {
                  label: this.translateService.instant('common.cancel'),
                  severity: 'secondary',
                },
                acceptButtonProps: {
                  label: this.translateService.instant('common.yes'),
                  severity: 'danger'
                },
                accept: () => {
                  this.shelfService.deleteShelf(entity?.id!).subscribe({
                    complete: () => {
                      this.router.navigate(['/']);
                      this.messageService.add({
                        severity: 'info',
                        summary: this.translateService.instant('book.browser.entityMenu.toast.success.summary'),
                        detail: this.translateService.instant('book.browser.entityMenu.shelf.delete.toast.deleted')
                      });
                    },
                    error: () => {
                      this.messageService.add({
                        severity: 'error',
                        summary: this.translateService.instant('book.browser.entityMenu.toast.failed.summary'),
                        detail: this.translateService.instant('book.browser.entityMenu.shelf.delete.toast.failed'),
                      });
                    }
                  });
                }
              });
            }
          }
        ]
      }
    ];
  }

  initializeMagicShelfMenuItems(entity: MagicShelf | null): MenuItem[] {
    const isAdmin = this.userService.getCurrentUser()?.permissions.admin ?? false;
    const isPublicShelf = entity?.isPublic ?? false;
    const disableOptions = isPublicShelf && !isAdmin;

    return [
      {
        label: this.translateService.instant('book.browser.entityMenu.options'),
        items: [
          {
            label: this.translateService.instant('book.browser.entityMenu.magicShelf.edit'),
            icon: 'pi pi-pen-to-square',
            disabled: disableOptions,
            command: () => {
              this.dialogLauncherService.openMagicShelfEditDialog((entity?.id as number));
            }
          },
          {
            separator: true
          },
          {
            label: this.translateService.instant('book.browser.entityMenu.magicShelf.delete.label'),
            icon: 'pi pi-trash',
            disabled: disableOptions,
            command: () => {
              this.confirmationService.confirm({
                message: this.translateService.instant('book.browser.entityMenu.magicShelf.delete.confirmMessage', {name: entity?.name}),
                header: this.translateService.instant('common.confirm'),
                rejectButtonProps: {
                  label: this.translateService.instant('common.cancel'),
                  severity: 'secondary',
                },
                acceptButtonProps: {
                  label: this.translateService.instant('common.yes'),
                  severity: 'danger'
                },
                accept: () => {
                  this.magicShelfService.deleteShelf(entity?.id!).subscribe({
                    complete: () => {
                      this.router.navigate(['/']);
                      this.messageService.add({
                        severity: 'info',
                        summary: this.translateService.instant('book.browser.entityMenu.toast.success.summary'),
                        detail: this.translateService.instant('book.browser.entityMenu.magicShelf.delete.toast.deleted')
                      });
                    },
                    error: () => {
                      this.messageService.add({
                        severity: 'error',
                        summary: this.translateService.instant('book.browser.entityMenu.toast.failed.summary'),
                        detail: this.translateService.instant('book.browser.entityMenu.magicShelf.delete.toast.failed'),
                      });
                    }
                  });
                }
              });
            }
          }
        ]
      }
    ];
  }
}
