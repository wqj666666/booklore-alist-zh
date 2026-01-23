import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';
import {MessageService} from 'primeng/api';
import {Router} from '@angular/router';
import {LibraryService} from '../book/service/library.service';
import {TableModule} from 'primeng/table';
import {Step, StepList, StepPanel, StepPanels, Stepper} from 'primeng/stepper';
import {FormsModule} from '@angular/forms';
import {InputText} from 'primeng/inputtext';
import {BookFileType, Library, LibraryPath, LibraryScanMode} from '../book/model/library.model';
import {ToggleSwitch} from 'primeng/toggleswitch';
import {Tooltip} from 'primeng/tooltip';
import {IconPickerService, IconSelection} from '../../shared/service/icon-picker.service';
import {Select} from 'primeng/select';
import {Button} from 'primeng/button';
import {IconDisplayComponent} from '../../shared/components/icon-display/icon-display.component';
import {DialogLauncherService} from '../../shared/services/dialog-launcher.service';
import {switchMap, takeUntil} from 'rxjs/operators';
import {map, Subject} from 'rxjs';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {DirectoryPickerResult} from '../../shared/components/directory-picker/directory-picker.component';

@Component({
  selector: 'app-library-creator',
  standalone: true,
  templateUrl: './library-creator.component.html',
  imports: [TableModule, StepPanel, FormsModule, InputText, Stepper, StepList, Step, StepPanels, ToggleSwitch, Tooltip, Select, Button, IconDisplayComponent, TranslateModule],
  styleUrl: './library-creator.component.scss'
})
export class LibraryCreatorComponent implements OnInit, OnDestroy {
  chosenLibraryName: string = '';
  folders: LibraryPath[] = [];
  selectedIcon: IconSelection | null = null;

  mode!: string;
  library!: Library | undefined;
  editModeLibraryName: string = '';
  watch: boolean = false;
  scanMode: LibraryScanMode = 'FILE_AS_BOOK';
  defaultBookFormat: BookFileType | undefined = undefined;

  scanModeOptions: {label: string; value: LibraryScanMode}[] = [];
  bookFormatOptions: {label: string; value: BookFileType | undefined}[] = [];

  private dialogLauncherService = inject(DialogLauncherService);
  private dynamicDialogRef = inject(DynamicDialogRef);
  private dynamicDialogConfig = inject(DynamicDialogConfig);
  private libraryService = inject(LibraryService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private iconPicker = inject(IconPickerService);
  private translateService = inject(TranslateService);
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.rebuildOptions();
    this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => this.rebuildOptions());

    const data = this.dynamicDialogConfig?.data;
    if (data?.mode === 'edit') {
      this.mode = data.mode;
      this.library = this.libraryService.findLibraryById(data.libraryId);
      if (this.library) {
        const {name, icon, iconType, paths, watch, scanMode, defaultBookFormat} = this.library;
        this.chosenLibraryName = name;
        this.editModeLibraryName = name;

        if (iconType === 'CUSTOM_SVG') {
          this.selectedIcon = {type: 'CUSTOM_SVG', value: icon};
        } else {
          const value = icon.slice(0, 6) === 'pi pi-' ? icon : `pi pi-${icon}`;
          this.selectedIcon = {type: 'PRIME_NG', value: value};
        }

        this.watch = watch;
        this.scanMode = scanMode || 'FILE_AS_BOOK';
        this.defaultBookFormat = defaultBookFormat || undefined;
        this.folders = paths.map(path => ({
          id: path.id,
          path: path.path,
          alistEnabled: path.alistEnabled ?? false,
          alistPath: path.alistPath ?? ''
        }));
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeDialog(): void {
    this.dynamicDialogRef.close();
  }

  openDirectoryPicker(): void {
    const ref = this.dialogLauncherService.openDirectoryPickerDialog();
    ref?.onClose.subscribe((result: DirectoryPickerResult | string[] | null) => {
      if (!result) return;

      // Handle both old format (string[]) and new format (DirectoryPickerResult)
      let folders: string[];
      let isAlist = false;

      if (Array.isArray(result)) {
        // Legacy format - just an array of folder paths
        folders = result;
      } else {
        // New format with storage type info
        folders = result.folders;
        isAlist = result.storageType === 'alist';
      }

      if (folders && folders.length > 0) {
        folders.forEach(folder => {
          const exists = this.folders.some(f => f.path === folder);
          if (!exists) {
            this.addFolderWithStorageType(folder, isAlist);
          }
        });
      }
    });
  }

  openIconPicker(): void {
    this.iconPicker.open().subscribe(icon => {
      if (icon) {
        this.selectedIcon = icon;
      }
    });
  }

  addFolder(folder: string): void {
    this.addFolderWithStorageType(folder, false);
  }

  addFolderWithStorageType(folder: string, isAlist: boolean): void {
    this.folders.push({
      path: folder,
      alistEnabled: isAlist,
      alistPath: isAlist ? folder : ''
    });
  }

  removeFolder(index: number): void {
    this.folders.splice(index, 1);
  }

  clearSelectedIcon(): void {
    this.selectedIcon = null;
  }

  isLibraryDetailsValid(): boolean {
    return !!this.chosenLibraryName.trim() && !!this.selectedIcon;
  }

  isDirectorySelectionValid(): boolean {
    return this.folders.length > 0;
  }

  validateLibraryNameAndProceed(activateCallback: Function): void {
    const trimmedLibraryName = this.chosenLibraryName.trim();
    if (trimmedLibraryName && trimmedLibraryName != this.editModeLibraryName) {
      const exists = this.libraryService.doesLibraryExistByName(trimmedLibraryName);
      if (exists) {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('libraryCreator.toast.nameExists.summary'),
          detail: this.translateService.instant('libraryCreator.toast.nameExists.detail'),
        });
      } else {
        activateCallback(2);
      }
    } else {
      activateCallback(2);
    }
  }

  createOrUpdateLibrary(): void {
    const iconValue = this.selectedIcon?.value || 'heart';
    const iconType = this.selectedIcon?.type || 'PRIME_NG';

    const library: Library = {
      name: this.chosenLibraryName,
      icon: iconValue,
      iconType: iconType,
      paths: this.folders.map(folder => ({
        id: folder.id,
        path: folder.path,
        alistEnabled: folder.alistEnabled,
        alistPath: folder.alistPath
      })),
      watch: this.watch,
      scanMode: this.scanMode,
      defaultBookFormat: this.defaultBookFormat
    };

    if (this.mode === 'edit') {
      this.libraryService.updateLibrary(library, this.library?.id).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('libraryCreator.toast.updated.summary'),
            detail: this.translateService.instant('libraryCreator.toast.updated.detail')
          });
          this.dynamicDialogRef.close();
        },
        error: (e) => {
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('libraryCreator.toast.updateFailed.summary'),
            detail: this.translateService.instant('libraryCreator.toast.updateFailed.detail')
          });
          console.error(e);
        }
      });
    } else {
      this.libraryService.scanLibraryPaths(library).pipe(
        switchMap(count => {
          if (count < 500) {
            return this.libraryService.createLibrary(library).pipe(
              map(createdLibrary => ({ createdLibrary, count }))
            );
          } else {
            console.warn(`Library has ${count} processable files (>500). Will use buffered loading.`);
            this.libraryService.setLargeLibraryLoading(true, count);
            return this.libraryService.createLibrary(library).pipe(
              map(createdLibrary => ({ createdLibrary, count }))
            );
          }
        })
      ).subscribe({
        next: ({ createdLibrary, count }) => {
          if (createdLibrary) {
            this.router.navigate(['/library', createdLibrary.id, 'books']);
            this.messageService.add({
              severity: 'success',
              summary: this.translateService.instant('libraryCreator.toast.created.summary'),
              detail: count >= 500
                ? this.translateService.instant('libraryCreator.toast.created.detailLarge', {count})
                : this.translateService.instant('libraryCreator.toast.created.detail')
            });
            this.dynamicDialogRef.close();
          }
        },
        error: (e) => {
          this.libraryService.setLargeLibraryLoading(false, 0);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('libraryCreator.toast.creationFailed.summary'),
            detail: this.translateService.instant('libraryCreator.toast.creationFailed.detail')
          });
          console.error(e);
        }
      });
    }
  }

  getFolderName(folderPath: string): string {
    if (!folderPath || typeof folderPath !== 'string') {
      return '';
    }
    const parts = folderPath.split('/').filter(p => p);
    return parts[parts.length - 1] || folderPath;
  }

  toggleAlistEnabled(folder: LibraryPath): void {
    folder.alistEnabled = !folder.alistEnabled;
    if (!folder.alistEnabled) {
      folder.alistPath = '';
    }
  }

  private rebuildOptions(): void {
    this.scanModeOptions = [
      {label: this.translateService.instant('libraryCreator.option.scanMode.fileAsBook'), value: 'FILE_AS_BOOK'},
      {label: this.translateService.instant('libraryCreator.option.scanMode.folderAsBook'), value: 'FOLDER_AS_BOOK'}
    ];

    this.bookFormatOptions = [
      {label: this.translateService.instant('libraryCreator.option.bookFormat.none'), value: undefined},
      {label: this.translateService.instant('libraryCreator.option.bookFormat.epub'), value: 'EPUB'},
      {label: this.translateService.instant('libraryCreator.option.bookFormat.pdf'), value: 'PDF'},
      {label: this.translateService.instant('libraryCreator.option.bookFormat.cbx'), value: 'CBX'}
    ];
  }
}
