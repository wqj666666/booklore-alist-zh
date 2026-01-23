import {ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild} from '@angular/core';
import {TooltipModule} from "primeng/tooltip";
import {AdditionalFile, Book, ReadStatus} from '../../../model/book.model';
import {Button} from 'primeng/button';
import {MenuModule} from 'primeng/menu';
import {ConfirmationService, MenuItem, MessageService} from 'primeng/api';
import {BookService} from '../../../service/book.service';
import {CheckboxChangeEvent, CheckboxModule} from 'primeng/checkbox';
import {FormsModule} from '@angular/forms';
import {MetadataRefreshType} from '../../../../metadata/model/request/metadata-refresh-type.enum';
import {UrlHelperService} from '../../../../../shared/service/url-helper.service';
import {NgClass} from '@angular/common';
import {User, UserService} from '../../../../settings/user-management/user.service';
import {filter, Subject} from 'rxjs';
import {EmailService} from '../../../../settings/email-v2/email.service';
import {TieredMenu} from 'primeng/tieredmenu';
import {Router} from '@angular/router';
import {ProgressBar} from 'primeng/progressbar';
import {take, takeUntil} from 'rxjs/operators';
import {ResetProgressTypes} from '../../../../../shared/constants/reset-progress-type';
import {ReadStatusHelper} from '../../../helpers/read-status.helper';
import {BookDialogHelperService} from '../book-dialog-helper.service';
import {TaskHelperService} from '../../../../settings/task-management/task-helper.service';
import {BookNavigationService} from '../../../service/book-navigation.service';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-book-card',
  templateUrl: './book-card.component.html',
  styleUrls: ['./book-card.component.scss'],
  imports: [Button, MenuModule, CheckboxModule, FormsModule, NgClass, TieredMenu, ProgressBar, TooltipModule, TranslateModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookCardComponent implements OnInit, OnChanges, OnDestroy {

  @Output() checkboxClick = new EventEmitter<{ index: number; book: Book; selected: boolean; shiftKey: boolean }>();
  @Output() menuToggled = new EventEmitter<boolean>();

  @Input() index!: number;
  @Input() book!: Book;
  @Input() isCheckboxEnabled: boolean = false;
  @Input() onBookSelect?: (book: Book, selected: boolean) => void;
  @Input() isSelected: boolean = false;
  @Input() bottomBarHidden: boolean = false;
  @Input() seriesViewEnabled: boolean = false;
  @Input() isSeriesCollapsed: boolean = false;

  @ViewChild('checkboxElem') checkboxElem!: ElementRef<HTMLInputElement>;

  items: MenuItem[] | undefined;
  isImageLoaded: boolean = false;
  isSubMenuLoading = false;
  private additionalFilesLoaded = false;

  private bookService = inject(BookService);
  private taskHelperService = inject(TaskHelperService);
  private userService = inject(UserService);
  private emailService = inject(EmailService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  protected urlHelper = inject(UrlHelperService);
  private confirmationService = inject(ConfirmationService);
  private bookDialogHelperService = inject(BookDialogHelperService);
  private bookNavigationService = inject(BookNavigationService);
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);

  protected _progressPercentage: number | null = null;
  protected _koProgressPercentage: number | null = null;
  protected _koboProgressPercentage: number | null = null;
  protected _displayTitle: string | undefined = undefined;
  protected _canReadBook: boolean = true;
  protected _isSeriesViewActive: boolean = false;
  protected _coverImageUrl: string = '';
  protected _readStatusIcon: string = '';
  protected _readStatusClass: string = '';
  protected _readStatusTooltipKey: string = '';
  protected _shouldShowStatusIcon: boolean = false;
  protected _hasProgress: boolean = false;

  private metadataCenterViewMode: 'route' | 'dialog' = 'route';
  private destroy$ = new Subject<void>();
  protected readStatusHelper = inject(ReadStatusHelper);
  private user: User | null = null;
  private menuInitialized = false;

  ngOnInit(): void {
    this.computeAllMemoizedValues();
    this.userService.userState$
      .pipe(
        filter(userState => !!userState?.user && userState.loaded),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(userState => {
        this.user = userState.user;
        this.metadataCenterViewMode = userState.user?.userSettings?.metadataCenterViewMode ?? 'route';
        if (this.menuInitialized) {
          this.initMenu();
          this.cdr.markForCheck();
        }
      });

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.menuInitialized) {
          this.initMenu();
          this.cdr.markForCheck();
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['book']) {
      this.computeAllMemoizedValues();
      if (!changes['book'].firstChange && this.menuInitialized) {
        this.additionalFilesLoaded = false;
        this.initMenu();
      }
    }

    if (changes['seriesViewEnabled'] || changes['isSeriesCollapsed']) {
      this._isSeriesViewActive = this.seriesViewEnabled && !!this.book.seriesCount && this.book.seriesCount >= 1;
      this._displayTitle = (this.isSeriesCollapsed && this.book.metadata?.seriesName) ? this.book.metadata?.seriesName : this.book.metadata?.title;
    }
  }

  private computeAllMemoizedValues(): void {
    this._progressPercentage = this.book.epubProgress?.percentage
      ?? this.book.pdfProgress?.percentage
      ?? this.book.cbxProgress?.percentage
      ?? null;

    this._koProgressPercentage = this.book.koreaderProgress?.percentage ?? null;
    this._koboProgressPercentage = this.book.koboProgress?.percentage ?? null;

    this._hasProgress = this._progressPercentage !== null || this._koProgressPercentage !== null || this._koboProgressPercentage !== null;

    this._isSeriesViewActive = this.seriesViewEnabled && !!this.book.seriesCount && this.book.seriesCount >= 1;
    this._displayTitle = (this.isSeriesCollapsed && this.book.metadata?.seriesName)
      ? this.book.metadata?.seriesName
      : this.book.metadata?.title;
    this._canReadBook = this.book?.bookType !== 'FB2';
    this._coverImageUrl = this.urlHelper.getThumbnailUrl(this.book.id, this.book.metadata?.coverUpdatedOn);

    this._readStatusIcon = this.readStatusHelper.getReadStatusIcon(this.book.readStatus);
    this._readStatusClass = this.readStatusHelper.getReadStatusClass(this.book.readStatus);
    this._readStatusTooltipKey = this.readStatusHelper.getReadStatusLabelKey(this.book.readStatus);
    this._shouldShowStatusIcon = this.readStatusHelper.shouldShowStatusIcon(this.book.readStatus);
  }

  get hasProgress(): boolean {
    return this._hasProgress;
  }

  get readStatusTooltipKey(): string {
    return this._readStatusTooltipKey;
  }

  get displayTitle(): string | undefined {
    return this._displayTitle;
  }

  get coverImageUrl(): string {
    return this._coverImageUrl;
  }

  onImageLoad(): void {
    this.isImageLoaded = true;
    this.cdr.markForCheck();
  }

  readBook(book: Book): void {
    this.bookService.readBook(book.id);
  }

  onMenuShow(): void {
    this.menuToggled.emit(true);
  }

  onMenuHide(): void {
    this.menuToggled.emit(false);
  }

  onMenuToggle(event: Event, menu: TieredMenu): void {
    if (!this.menuInitialized) {
      this.menuInitialized = true;
      this.initMenu();
      this.cdr.markForCheck();
    }

    menu.toggle(event);

    if (!this.additionalFilesLoaded && !this.isSubMenuLoading && this.needsAdditionalFilesData()) {
      this.isSubMenuLoading = true;
      this.cdr.markForCheck();
      this.bookService.getBookByIdFromAPI(this.book.id, true).subscribe({
        next: (book) => {
          this.book = book;
          this.additionalFilesLoaded = true;
          this.isSubMenuLoading = false;
          this.initMenu();
          this.cdr.markForCheck();
        },
        error: () => {
          this.isSubMenuLoading = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  private needsAdditionalFilesData(): boolean {
    if (this.additionalFilesLoaded) {
      return false;
    }
    const hasNoAlternativeFormats = !this.book.alternativeFormats || this.book.alternativeFormats.length === 0;
    const hasNoSupplementaryFiles = !this.book.supplementaryFiles || this.book.supplementaryFiles.length === 0;
    const canDownload = !!this.user?.permissions.canDownload;
    const canDeleteBook = !!this.user?.permissions.canDeleteBook;
    return (canDownload || canDeleteBook) && hasNoAlternativeFormats && hasNoSupplementaryFiles;
  }

  private initMenu() {
    this.items = [
      {
        label: this.translate.instant('book.card.menu.assignShelf'),
        icon: 'pi pi-folder',
        command: () => this.openShelfDialog()
      },
      {
        label: this.translate.instant('book.card.menu.viewDetails'),
        icon: 'pi pi-info-circle',
        command: () => {
          setTimeout(() => {
            this.openBookInfo(this.book);
          }, 150);
        },
      },
      ...this.getPermissionBasedMenuItems(),
      ...this.moreMenuItems(),
    ];
  }

  private getPermissionBasedMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];
    const loadingLabel = `${this.translate.instant('common.loading')}...`;

    if (this.user?.permissions.canDownload) {
      const hasAdditionalFiles = (this.book.alternativeFormats && this.book.alternativeFormats.length > 0) ||
        (this.book.supplementaryFiles && this.book.supplementaryFiles.length > 0);

      if (hasAdditionalFiles) {
        const downloadItems = this.getDownloadMenuItems();
        items.push({
          label: this.translate.instant('book.card.menu.download'),
          icon: 'pi pi-download',
          items: downloadItems
        });
      } else if (this.additionalFilesLoaded) {
        items.push({
          label: this.translate.instant('book.card.menu.download'),
          icon: 'pi pi-download',
          command: () => {
            this.bookService.downloadFile(this.book);
          }
        });
      } else {
        items.push({
          label: this.translate.instant('book.card.menu.download'),
          icon: this.isSubMenuLoading ? 'pi pi-spin pi-spinner' : 'pi pi-download',
          items: [{label: loadingLabel, disabled: true}]
        });
      }
    }

    if (this.user?.permissions.canDeleteBook) {
      const hasAdditionalFiles = (this.book.alternativeFormats && this.book.alternativeFormats.length > 0) ||
        (this.book.supplementaryFiles && this.book.supplementaryFiles.length > 0);

      if (hasAdditionalFiles) {
        const deleteItems = this.getDeleteMenuItems();
        items.push({
          label: this.translate.instant('common.delete'),
          icon: 'pi pi-trash',
          items: deleteItems
        });
      } else if (this.additionalFilesLoaded) {
        items.push({
          label: this.translate.instant('common.delete'),
          icon: 'pi pi-trash',
          command: () => {
            const title = this.book.metadata?.title ?? this.book.fileName ?? '';
            this.confirmationService.confirm({
              message: this.translate.instant('book.card.confirm.deleteBook.message', {title}),
              header: this.translate.instant('book.card.confirm.deleteBook.header'),
              icon: 'pi pi-exclamation-triangle',
              acceptIcon: 'pi pi-trash',
              rejectIcon: 'pi pi-times',
              acceptButtonStyleClass: 'p-button-danger',
              accept: () => {
                this.bookService.deleteBooks(new Set([this.book.id])).subscribe();
              }
            });
          }
        });
      } else {
        items.push({
          label: this.translate.instant('common.delete'),
          icon: this.isSubMenuLoading ? 'pi pi-spin pi-spinner' : 'pi pi-trash',
          items: [{label: loadingLabel, disabled: true}]
        });
      }
    }

    if (this.user?.permissions.canEmailBook) {
      items.push(
        {
          label: this.translate.instant('book.card.menu.emailBook'),
          icon: 'pi pi-envelope',
          items: [{
            label: this.translate.instant('book.card.menu.quickSend'),
            icon: 'pi pi-envelope',
            command: () => {
              this.emailService.emailBookQuick(this.book.id).subscribe({
                next: () => {
                  this.messageService.add({
                    severity: 'info',
                    summary: this.translate.instant('book.card.toast.emailScheduled.summary'),
                    detail: this.translate.instant('book.card.toast.emailScheduled.detail'),
                  });
                },
                error: (err) => {
                  const errorMessage = err?.error?.message || this.translate.instant('book.card.toast.emailFailed.detail');
                  this.messageService.add({
                    severity: 'error',
                    summary: this.translate.instant('book.card.toast.emailFailed.summary'),
                    detail: errorMessage,
                  });
                },
              });
            }
          },
            {
              label: this.translate.instant('book.card.menu.customSend'),
              icon: 'pi pi-envelope',
              command: () => {
                this.bookDialogHelperService.openCustomSendDialog(this.book.id);
              }
            }
          ]
        });
    }

    if (this.user?.permissions.canEditMetadata) {
      items.push({
        label: this.translate.instant('book.card.menu.metadata'),
        icon: 'pi pi-database',
        items: [
          {
            label: this.translate.instant('book.card.menu.searchMetadata'),
            icon: 'pi pi-sparkles',
            command: () => {
              setTimeout(() => {
                this.router.navigate(['/book', this.book.id], {
                  queryParams: {tab: 'match'}
                })
              }, 150);
            },
          },
          {
            label: this.translate.instant('book.card.menu.autoFetch'),
            icon: 'pi pi-bolt',
            command: () => {
              this.taskHelperService.refreshMetadataTask({
                refreshType: MetadataRefreshType.BOOKS,
                bookIds: [this.book.id],
              }).subscribe();
            }
          },
          {
            label: this.translate.instant('book.card.menu.customFetch'),
            icon: 'pi pi-sync',
            command: () => {
              this.bookDialogHelperService.openMetadataRefreshDialog(new Set([this.book!.id]))
            },
          },
          {
            label: this.translate.instant('book.card.menu.regenerateCoverFile'),
            icon: 'pi pi-image',
            command: () => {
              this.bookService.regenerateCover(this.book.id).subscribe({
                next: () => this.messageService.add({
                  severity: 'success',
                  summary: this.translate.instant('book.card.toast.coverRegenStarted.summary'),
                  detail: this.translate.instant('book.card.toast.coverRegenStarted.detail')
                }),
                error: () => this.messageService.add({
                  severity: 'error',
                  summary: this.translate.instant('book.card.toast.coverRegenFailed.summary'),
                  detail: this.translate.instant('book.card.toast.coverRegenFailed.detail')
                })
              });
            }
          },
          {
            label: this.translate.instant('book.card.menu.generateCustomCover'),
            icon: 'pi pi-palette',
            command: () => {
              this.bookService.generateCustomCover(this.book.id).subscribe({
                next: () => this.messageService.add({
                  severity: 'success',
                  summary: this.translate.instant('book.card.toast.customCoverGenerated.summary'),
                  detail: this.translate.instant('book.card.toast.customCoverGenerated.detail')
                }),
                error: () => this.messageService.add({
                  severity: 'error',
                  summary: this.translate.instant('book.card.toast.customCoverFailed.summary'),
                  detail: this.translate.instant('book.card.toast.customCoverFailed.detail')
                })
              });
            }
          }
        ]
      });
    }

    return items;
  }

  private moreMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];
    const moreActions: MenuItem[] = [];

    if (this.user?.permissions.canMoveOrganizeFiles) {
      moreActions.push({
        label: this.translate.instant('book.card.menu.organizeFile'),
        icon: 'pi pi-arrows-h',
        command: () => {
          this.bookDialogHelperService.openFileMoverDialog(new Set([this.book.id]));
        }
      });
    }

    moreActions.push(
      {
        label: this.translate.instant('book.card.menu.readStatus'),
        icon: 'pi pi-book',
        items: [
          ReadStatus.UNREAD,
          ReadStatus.READING,
          ReadStatus.RE_READING,
          ReadStatus.PARTIALLY_READ,
          ReadStatus.PAUSED,
          ReadStatus.READ,
          ReadStatus.WONT_READ,
          ReadStatus.ABANDONED,
          ReadStatus.UNSET,
        ].map((status) => {
          const labelKey = this.readStatusHelper.getReadStatusLabelKey(status);
          const label = this.translate.instant(labelKey);
          return {
            label,
          command: () => {
            this.bookService.updateBookReadStatus(this.book.id, status as ReadStatus).subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: this.translate.instant('book.card.toast.readStatusUpdated.summary'),
                  detail: this.translate.instant('book.card.toast.readStatusUpdated.detail', {label}),
                  life: 2000
                });
              },
              error: () => {
                this.messageService.add({
                  severity: 'error',
                  summary: this.translate.instant('book.card.toast.readStatusUpdateFailed.summary'),
                  detail: this.translate.instant('book.card.toast.readStatusUpdateFailed.detail'),
                  life: 3000
                });
              }
            });
          }
          };
        })
      },
      {
        label: this.translate.instant('book.card.menu.resetBookloreProgress'),
        icon: 'pi pi-undo',
        command: () => {
          this.bookService.resetProgress(this.book.id, ResetProgressTypes.BOOKLORE).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('book.card.toast.bookloreProgressReset.summary'),
                detail: this.translate.instant('book.card.toast.bookloreProgressReset.detail'),
                life: 1500
              });
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('book.card.toast.bookloreProgressResetFailed.summary'),
                detail: this.translate.instant('book.card.toast.bookloreProgressResetFailed.detail'),
                life: 1500
              });
            }
          });
        },
      },
      {
        label: this.translate.instant('book.card.menu.resetKoreaderProgress'),
        icon: 'pi pi-undo',
        command: () => {
          this.bookService.resetProgress(this.book.id, ResetProgressTypes.KOREADER).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('book.card.toast.koreaderProgressReset.summary'),
                detail: this.translate.instant('book.card.toast.koreaderProgressReset.detail'),
                life: 1500
              });
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('book.card.toast.koreaderProgressResetFailed.summary'),
                detail: this.translate.instant('book.card.toast.koreaderProgressResetFailed.detail'),
                life: 1500
              });
            }
          });
        },
      }
    );

    items.push({
      label: this.translate.instant('book.card.menu.moreActions'),
      icon: 'pi pi-ellipsis-h',
      items: moreActions
    });

    return items;
  }

  private openShelfDialog(): void {
    this.bookDialogHelperService.openShelfAssignerDialog(this.book, null);
  }

  openSeriesInfo(): void {
    const seriesName = this.book?.metadata?.seriesName;
    if (this.isSeriesCollapsed && seriesName) {
      const encodedSeriesName = encodeURIComponent(seriesName);
      this.router.navigate(['/series', encodedSeriesName]);
    } else {
      this.openBookInfo(this.book);
    }
  }

  openBookInfo(book: Book): void {
    const allBookIds = this.bookNavigationService.getAvailableBookIds();
    if (allBookIds.length > 0) {
      this.bookNavigationService.setNavigationContext(allBookIds, book.id);
    }

    if (this.metadataCenterViewMode === 'route') {
      this.router.navigate(['/book', book.id], {
        queryParams: {tab: 'view'}
      });
    } else {
      this.bookDialogHelperService.openBookDetailsDialog(book.id);
    }
  }

  private getDownloadMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];

    items.push({
      label: `${this.book.fileName || this.translate.instant('book.card.menu.bookFile')}`,
      icon: 'pi pi-file',
      command: () => {
        this.bookService.downloadFile(this.book);
      }
    });

    if (this.hasAdditionalFiles()) {
      items.push({separator: true});
    }

    if (this.book.alternativeFormats && this.book.alternativeFormats.length > 0) {
      this.book.alternativeFormats.forEach(format => {
        const extension = this.getFileExtension(format.filePath);
        items.push({
          label: `${format.fileName} (${this.getFileSizeInMB(format)})`,
          icon: this.getFileIcon(extension),
          command: () => this.downloadAdditionalFile(this.book, format.id)
        });
      });
    }

    if (this.book.alternativeFormats && this.book.alternativeFormats.length > 0 &&
      this.book.supplementaryFiles && this.book.supplementaryFiles.length > 0) {
      items.push({separator: true});
    }

    if (this.book.supplementaryFiles && this.book.supplementaryFiles.length > 0) {
      this.book.supplementaryFiles.forEach(file => {
        const extension = this.getFileExtension(file.filePath);
        items.push({
          label: `${file.fileName} (${this.getFileSizeInMB(file)})`,
          icon: this.getFileIcon(extension),
          command: () => this.downloadAdditionalFile(this.book, file.id)
        });
      });
    }

    return items;
  }

  private getDeleteMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];

    items.push({
      label: this.translate.instant('book.card.menu.book'),
      icon: 'pi pi-book',
      command: () => {
        const title = this.book.metadata?.title ?? this.book.fileName ?? '';
        this.confirmationService.confirm({
          message: this.translate.instant('book.card.confirm.deleteBook.message', {title}),
          header: this.translate.instant('book.card.confirm.deleteBook.header'),
          icon: 'pi pi-exclamation-triangle',
          acceptIcon: 'pi pi-trash',
          rejectIcon: 'pi pi-times',
          acceptButtonStyleClass: 'p-button-danger',
          accept: () => {
            this.bookService.deleteBooks(new Set([this.book.id])).subscribe();
          }
        });
      }
    });

    if (this.hasAdditionalFiles()) {
      items.push({separator: true});
    }

    if (this.book.alternativeFormats && this.book.alternativeFormats.length > 0) {
      this.book.alternativeFormats.forEach(format => {
        const extension = this.getFileExtension(format.filePath);
        items.push({
          label: `${format.fileName} (${this.getFileSizeInMB(format)})`,
          icon: this.getFileIcon(extension),
          command: () => this.deleteAdditionalFile(this.book.id, format.id, format.fileName || 'file')
        });
      });
    }

    if (this.book.alternativeFormats && this.book.alternativeFormats.length > 0 &&
      this.book.supplementaryFiles && this.book.supplementaryFiles.length > 0) {
      items.push({separator: true});
    }

    if (this.book.supplementaryFiles && this.book.supplementaryFiles.length > 0) {
      this.book.supplementaryFiles.forEach(file => {
        const extension = this.getFileExtension(file.filePath);
        items.push({
          label: `${file.fileName} (${this.getFileSizeInMB(file)})`,
          icon: this.getFileIcon(extension),
          command: () => this.deleteAdditionalFile(this.book.id, file.id, file.fileName || 'file')
        });
      });
    }

    return items;
  }

  private hasAdditionalFiles(): boolean {
    return !!(this.book.alternativeFormats && this.book.alternativeFormats.length > 0) ||
      !!(this.book.supplementaryFiles && this.book.supplementaryFiles.length > 0);
  }

  private downloadAdditionalFile(book: Book, fileId: number): void {
    this.bookService.downloadAdditionalFile(book, fileId);
  }

  private deleteAdditionalFile(bookId: number, fileId: number, fileName: string): void {
    this.confirmationService.confirm({
      message: this.translate.instant('book.card.confirm.deleteAdditionalFile.message', {fileName}),
      header: this.translate.instant('book.card.confirm.deleteAdditionalFile.header'),
      icon: 'pi pi-exclamation-triangle',
      acceptIcon: 'pi pi-trash',
      rejectIcon: 'pi pi-times',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.bookService.deleteAdditionalFile(bookId, fileId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('book.card.toast.deleteAdditionalFileSuccess.summary'),
              detail: this.translate.instant('book.card.toast.deleteAdditionalFileSuccess.detail', {fileName})
            });
          },
          error: (error) => {
            const errorMessage = error?.message || this.translate.instant('book.card.toast.unknownError');
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('book.card.toast.deleteAdditionalFileFailed.summary'),
              detail: this.translate.instant('book.card.toast.deleteAdditionalFileFailed.detail', {error: errorMessage})
            });
          }
        });
      }
    });
  }

  private getFileExtension(filePath?: string): string | null {
    if (!filePath) return null;
    const parts = filePath.split('.');
    if (parts.length < 2) return null;
    return parts.pop()?.toUpperCase() || null;
  }

  private getFileIcon(fileType: string | null): string {
    if (!fileType) return 'pi pi-file';
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'pi pi-file-pdf';
      case 'epub':
      case 'mobi':
      case 'azw3':
      case 'fb2':
        return 'pi pi-book';
      case 'cbz':
      case 'cbr':
      case 'cbx':
        return 'pi pi-image';
      default:
        return 'pi pi-file';
    }
  }

  private getFileSizeInMB(fileInfo: AdditionalFile): string {
    const sizeKb = fileInfo?.fileSizeKb;
    return sizeKb != null ? `${(sizeKb / 1024).toFixed(2)} MB` : '-';
  }

  private lastMouseEvent: MouseEvent | null = null;

  captureMouseEvent(event: MouseEvent): void {
    this.lastMouseEvent = event;
  }

  onCardClick(event: MouseEvent): void {
    if (!event.ctrlKey) {
      return;
    }

    this.toggleCardSelection(!this.isSelected)
  }

  toggleCardSelection(selected: boolean): void {
    if (!this.isCheckboxEnabled) {
      return;
    }

    this.isSelected = selected;
    const shiftKey = this.lastMouseEvent?.shiftKey ?? false;

    this.checkboxClick.emit({
      index: this.index,
      book: this.book,
      selected: selected,
      shiftKey: shiftKey,
    });

    if (this.onBookSelect) {
      this.onBookSelect(this.book, selected);
    }

    this.lastMouseEvent = null;
  }

  toggleSelection(event: CheckboxChangeEvent): void {
    this.toggleCardSelection(event.checked);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
