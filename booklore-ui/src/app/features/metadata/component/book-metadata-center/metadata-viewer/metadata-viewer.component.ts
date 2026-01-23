import {Component, DestroyRef, inject, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {Button} from 'primeng/button';
import {AsyncPipe, DecimalPipe, NgClass, UpperCasePipe} from '@angular/common';
import {combineLatest, Observable} from 'rxjs';
import {BookService} from '../../../../book/service/book.service';
import {Rating, RatingRateEvent} from 'primeng/rating';
import {FormsModule} from '@angular/forms';
import {Book, BookMetadata, BookRecommendation, FileInfo, ReadStatus} from '../../../../book/model/book.model';
import {UrlHelperService} from '../../../../../shared/service/url-helper.service';
import {UserService} from '../../../../settings/user-management/user.service';
import {SplitButton} from 'primeng/splitbutton';
import {ConfirmationService, MenuItem, MessageService} from 'primeng/api';
import {DynamicDialogRef} from 'primeng/dynamicdialog';
import {EmailService} from '../../../../settings/email-v2/email.service';
import {Tooltip} from 'primeng/tooltip';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Editor} from 'primeng/editor';
import {ProgressBar} from 'primeng/progressbar';
import {MetadataRefreshType} from '../../../model/request/metadata-refresh-type.enum';
import {Router} from '@angular/router';
import {filter, map, startWith, switchMap, take, tap} from 'rxjs/operators';
import {Menu} from 'primeng/menu';
import {InfiniteScrollDirective} from 'ngx-infinite-scroll';
import {BookCardLiteComponent} from '../../../../book/components/book-card-lite/book-card-lite-component';
import {ResetProgressType, ResetProgressTypes} from '../../../../../shared/constants/reset-progress-type';
import {DatePicker} from 'primeng/datepicker';
import {Tab, TabList, TabPanel, TabPanels, Tabs} from 'primeng/tabs';
import {BookReviewsComponent} from '../../../../book/components/book-reviews/book-reviews.component';
import {ProgressSpinner} from 'primeng/progressspinner';
import {TieredMenu} from 'primeng/tieredmenu';
import {Image} from 'primeng/image';
import {BookDialogHelperService} from '../../../../book/components/book-browser/book-dialog-helper.service';
import {TagColor, TagComponent} from '../../../../../shared/components/tag/tag.component';
import {BookNotesComponent} from '../../../../book/components/book-notes/book-notes-component';
import {TaskHelperService} from '../../../../settings/task-management/task-helper.service';
import {
  fileSizeRanges,
  matchScoreRanges,
  pageCountRanges
} from '../../../../book/components/book-browser/book-filter/book-filter.component';
import {BookNavigationService} from '../../../../book/service/book-navigation.service';
import {Divider} from 'primeng/divider';
import {BookMetadataHostService} from '../../../../../shared/service/book-metadata-host.service';
import { BookReadingSessionsComponent } from '../book-reading-sessions/book-reading-sessions.component';
import {AppSettingsService} from '../../../../../shared/service/app-settings.service';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-metadata-viewer',
  standalone: true,
  templateUrl: './metadata-viewer.component.html',
  styleUrl: './metadata-viewer.component.scss',
  imports: [Button, AsyncPipe, Rating, FormsModule, SplitButton, NgClass, Tooltip, DecimalPipe, Editor, ProgressBar, Menu, InfiniteScrollDirective, BookCardLiteComponent, DatePicker, Tab, TabList, TabPanel, TabPanels, Tabs, BookReviewsComponent, BookNotesComponent, ProgressSpinner, TieredMenu, Image, TagComponent, UpperCasePipe, Divider, BookReadingSessionsComponent, TranslateModule]
})
export class MetadataViewerComponent implements OnInit, OnChanges {
  @Input() book$!: Observable<Book | null>;
  @Input() recommendedBooks: BookRecommendation[] = [];
  @ViewChild(Editor) quillEditor!: Editor;
  private originalRecommendedBooks: BookRecommendation[] = [];

  private bookDialogHelperService = inject(BookDialogHelperService)
  private emailService = inject(EmailService);
  private messageService = inject(MessageService);
  private bookService = inject(BookService);
  private taskHelperService = inject(TaskHelperService);
  protected urlHelper = inject(UrlHelperService);
  protected userService = inject(UserService);
  private confirmationService = inject(ConfirmationService);
  private translateService = inject(TranslateService);
  private langChange$ = this.translateService.onLangChange.pipe(startWith(null));

  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private dialogRef?: DynamicDialogRef;

  readMenuItems$!: Observable<MenuItem[]>;
  refreshMenuItems$!: Observable<MenuItem[]>;
  otherItems$!: Observable<MenuItem[]>;
  downloadMenuItems$!: Observable<MenuItem[]>;
  bookInSeries: Book[] = [];
  isExpanded = false;
  showFilePath = false;
  isAutoFetching = false;
  private metadataCenterViewMode: 'route' | 'dialog' = 'route';
  selectedReadStatus: ReadStatus = ReadStatus.UNREAD;
  isEditingDateFinished = false;
  editDateFinished: Date | null = null;

  readStatusOptions: { value: ReadStatus, labelKey: string }[] = [
    {value: ReadStatus.UNREAD, labelKey: 'metadata.viewer.readStatus.unread'},
    {value: ReadStatus.PAUSED, labelKey: 'metadata.viewer.readStatus.paused'},
    {value: ReadStatus.READING, labelKey: 'metadata.viewer.readStatus.reading'},
    {value: ReadStatus.RE_READING, labelKey: 'metadata.viewer.readStatus.reReading'},
    {value: ReadStatus.READ, labelKey: 'metadata.viewer.readStatus.read'},
    {value: ReadStatus.PARTIALLY_READ, labelKey: 'metadata.viewer.readStatus.partiallyRead'},
    {value: ReadStatus.ABANDONED, labelKey: 'metadata.viewer.readStatus.abandoned'},
    {value: ReadStatus.WONT_READ, labelKey: 'metadata.viewer.readStatus.wontRead'},
    {value: ReadStatus.UNSET, labelKey: 'metadata.viewer.readStatus.unset'},
  ];

  private bookNavigationService = inject(BookNavigationService);
  private metadataHostService = inject(BookMetadataHostService);
  private appSettingsService = inject(AppSettingsService);
  private appSettings$ = this.appSettingsService.appSettings$;
  amazonDomain = 'com';
  navigationState$ = this.bookNavigationService.getNavigationState();
  readStatusMenuItems: MenuItem[] = [];

  ngOnInit(): void {
    const bookWithLang$ = combineLatest([this.book$, this.langChange$]).pipe(
      map(([book]) => book),
      filter((book): book is Book => book !== null)
    );

    this.refreshMenuItems$ = bookWithLang$.pipe(
      map((book): MenuItem[] => [
        {
          label: this.translateService.instant('metadata.viewer.menu.customFetch'),
          icon: 'pi pi-sync',
          command: () => {
            this.bookDialogHelperService.openMetadataFetchOptionsDialog(book.id);
          }
        }
      ])
    );

    this.readMenuItems$ = bookWithLang$.pipe(
      map((book): MenuItem[] => [
        {
          label: this.translateService.instant('metadata.viewer.menu.streamingReader'),
          command: () => this.read(book.id, 'streaming')
        }
      ])
    );

    this.downloadMenuItems$ = this.book$.pipe(
      filter((book): book is Book => book !== null &&
        ((book.alternativeFormats !== undefined && book.alternativeFormats.length > 0) ||
          (book.supplementaryFiles !== undefined && book.supplementaryFiles.length > 0))),
      map((book): MenuItem[] => {
        const items: MenuItem[] = [];

        // Add alternative formats
        if (book.alternativeFormats && book.alternativeFormats.length > 0) {
          book.alternativeFormats.forEach(format => {
            const extension = this.getFileExtension(format.filePath);
            items.push({
              label: `${format.fileName} (${this.getFileSizeInMB(format)})`,
              icon: this.getFileIcon(extension),
              command: () => this.downloadAdditionalFile(book, format.id)
            });
          });
        }

        // Add separator if both types exist
        if (book.alternativeFormats && book.alternativeFormats.length > 0 &&
          book.supplementaryFiles && book.supplementaryFiles.length > 0) {
          items.push({separator: true});
        }

        // Add supplementary files
        if (book.supplementaryFiles && book.supplementaryFiles.length > 0) {
          book.supplementaryFiles.forEach(file => {
            const extension = this.getFileExtension(file.filePath);
            items.push({
              label: `${file.fileName} (${this.getFileSizeInMB(file)})`,
              icon: this.getFileIcon(extension),
              command: () => this.downloadAdditionalFile(book, file.id)
            });
          });
        }

        return items;
      })
    );

    this.otherItems$ = bookWithLang$.pipe(
      switchMap((book) =>
        this.userService.userState$.pipe(
          take(1),
          map(userState => {
            const items: MenuItem[] = [];

            // Add allowed submenus based on user permissions

            if (userState?.user?.permissions.canUpload || userState?.user?.permissions.admin) {
              items.push({
                label: this.translateService.instant('metadata.viewer.menu.uploadFile'),
                icon: 'pi pi-upload',
                command: () => {
                  this.bookDialogHelperService.openAdditionalFileUploaderDialog(book);
                },
              });
            }

            if (userState?.user?.permissions.canManageLibrary || userState?.user?.permissions.admin) {
              items.push({
                label: this.translateService.instant('metadata.viewer.menu.organizeFiles'),
                icon: 'pi pi-arrows-h',
                command: () => {
                  this.openFileMoverDialog(book.id);
                },
              });
            }

            if (userState?.user?.permissions.canEmailBook || userState?.user?.permissions.admin) {
              items.push({
                label: this.translateService.instant('metadata.viewer.menu.sendBook'),
                icon: 'pi pi-send',
                items: [
                  {
                    label: this.translateService.instant('metadata.viewer.menu.quickSend'),
                    icon: 'pi pi-bolt',
                    command: () => this.quickSend(book.id)
                  },
                  {
                    label: this.translateService.instant('metadata.viewer.menu.customSend'),
                    icon: 'pi pi-cog',
                    command: () => {
                      this.bookDialogHelperService.openCustomSendDialog(book.id);
                    }
                  }
                ]
              });
            }

            if (userState?.user?.permissions.canDeleteBook || userState?.user?.permissions.admin) {
              items.push({
                label: this.translateService.instant('metadata.viewer.menu.deleteBook'),
                icon: 'pi pi-trash',
                command: () => {
                  this.confirmationService.confirm({
                    message: this.translateService.instant('metadata.viewer.confirm.deleteBook.message', {title: book.metadata?.title}),
                    header: this.translateService.instant('metadata.viewer.confirm.deleteBook.header'),
                    icon: 'pi pi-exclamation-triangle',
                    acceptIcon: 'pi pi-trash',
                    rejectIcon: 'pi pi-times',
                    acceptButtonStyleClass: 'p-button-danger',
                    accept: () => {
                      this.bookService.deleteBooks(new Set([book.id])).subscribe({
                        next: () => {
                          if (this.metadataCenterViewMode === 'route') {
                            this.router.navigate(['/dashboard']);
                          } else {
                            this.dialogRef?.close();
                          }
                        },
                        error: () => {
                        }
                      });
                    }
                  });
                },
              });

              // Add delete additional files menu if there are any additional files
              if ((book.alternativeFormats && book.alternativeFormats.length > 0) ||
                (book.supplementaryFiles && book.supplementaryFiles.length > 0)) {
                const deleteFileItems: MenuItem[] = [];

                // Add alternative formats
                if (book.alternativeFormats && book.alternativeFormats.length > 0) {
                  book.alternativeFormats.forEach(format => {
                    const extension = this.getFileExtension(format.filePath);
                    deleteFileItems.push({
                      label: `${format.fileName} (${this.getFileSizeInMB(format)})`,
                      icon: this.getFileIcon(extension),
                      command: () => this.deleteAdditionalFile(book.id, format.id, format.fileName || this.translateService.instant('metadata.viewer.value.file'))
                    });
                  });
                }

                // Add separator if both types exist
                if (book.alternativeFormats && book.alternativeFormats.length > 0 &&
                  book.supplementaryFiles && book.supplementaryFiles.length > 0) {
                  deleteFileItems.push({separator: true});
                }

                // Add supplementary files
                if (book.supplementaryFiles && book.supplementaryFiles.length > 0) {
                  book.supplementaryFiles.forEach(file => {
                    const extension = this.getFileExtension(file.filePath);
                    deleteFileItems.push({
                      label: `${file.fileName} (${this.getFileSizeInMB(file)})`,
                      icon: this.getFileIcon(extension),
                      command: () => this.deleteAdditionalFile(book.id, file.id, file.fileName || this.translateService.instant('metadata.viewer.value.file'))
                    });
                  });
                }

                items.push({
                  label: this.translateService.instant('metadata.viewer.menu.deleteAdditionalFiles'),
                  icon: 'pi pi-trash',
                  items: deleteFileItems
                });
              }
            }

            return items;
          })
        )
      )
    );

    this.langChange$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.readStatusMenuItems = this.readStatusOptions.map(option => ({
          label: this.translateService.instant(option.labelKey),
          command: () => this.updateReadStatus(option.value)
        }));
      });

    this.userService.userState$
      .pipe(
        filter(userState => !!userState?.user && userState.loaded),
        take(1)
      )
      .subscribe(userState => {
        this.metadataCenterViewMode = userState.user?.userSettings.metadataCenterViewMode ?? 'route';
      });

    this.book$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((book): book is Book => book != null && book.metadata != null)
      )
      .subscribe(book => {
        const metadata = book.metadata;
        this.isAutoFetching = false;
        this.loadBooksInSeriesAndFilterRecommended(metadata!.bookId);
        if (this.quillEditor?.quill) {
          this.quillEditor.quill.root.innerHTML = metadata!.description;
        }
        this.selectedReadStatus = book.readStatus ?? ReadStatus.UNREAD;
      });

    this.appSettings$
      .pipe(
        filter(settings => settings != null),
        take(1)
      )
      .subscribe(settings => {
        this.amazonDomain = settings?.metadataProviderSettings?.amazon?.domain ?? 'com';
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recommendedBooks']) {
      this.originalRecommendedBooks = [...this.recommendedBooks];
      this.withCurrentBook(book => this.filterRecommendations(book));
    }
  }

  private withCurrentBook(callback: (book: Book | null) => void): void {
    this.book$.pipe(take(1)).subscribe(callback);
  }

  private loadBooksInSeriesAndFilterRecommended(bookId: number): void {
    this.bookService.getBooksInSeries(bookId).pipe(
      tap(series => {
        series.sort((a, b) => (a.metadata?.seriesNumber ?? 0) - (b.metadata?.seriesNumber ?? 0));
        this.bookInSeries = series;
        this.originalRecommendedBooks = [...this.recommendedBooks];
      }),
      switchMap(() => this.book$.pipe(take(1))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(book => this.filterRecommendations(book));
  }

  private filterRecommendations(book: Book | null): void {
    if (!this.originalRecommendedBooks) return;
    const bookInSeriesIds = new Set(this.bookInSeries.map(book => book.id));
    this.recommendedBooks = this.originalRecommendedBooks.filter(
      rec => !bookInSeriesIds.has(rec.book.id)
    );
  }

  get defaultTabValue(): number {
    return this.bookInSeries && this.bookInSeries.length > 1 ? 1 : 2;
  }

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }

  read(bookId: number | undefined, reader: "ngx" | "streaming" | undefined): void {
    if (bookId) this.bookService.readBook(bookId, reader);
  }

  download(book: Book) {
    this.bookService.downloadFile(book);
  }

  downloadAdditionalFile(book: Book, fileId: number) {
    this.bookService.downloadAdditionalFile(book, fileId);
  }

  deleteAdditionalFile(bookId: number, fileId: number, fileName: string) {
    this.confirmationService.confirm({
      message: this.translateService.instant('metadata.viewer.confirm.deleteAdditionalFile.message', {fileName}),
      header: this.translateService.instant('metadata.viewer.confirm.deleteAdditionalFile.header'),
      icon: 'pi pi-exclamation-triangle',
      acceptIcon: 'pi pi-trash',
      rejectIcon: 'pi pi-times',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.bookService.deleteAdditionalFile(bookId, fileId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: this.translateService.instant('metadata.viewer.toast.deleteAdditionalFileSuccess.summary'),
              detail: this.translateService.instant('metadata.viewer.toast.deleteAdditionalFileSuccess.detail', {fileName})
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: this.translateService.instant('metadata.viewer.toast.deleteAdditionalFileFailed.summary'),
              detail: this.translateService.instant('metadata.viewer.toast.deleteAdditionalFileFailed.detail', {error: error?.message || this.translateService.instant('metadata.viewer.value.unknownError')})
            });
          }
        });
      }
    });
  }

  quickRefresh(bookId: number) {
    this.isAutoFetching = true;

    this.taskHelperService.refreshMetadataTask({
      refreshType: MetadataRefreshType.BOOKS,
      bookIds: [bookId],
    }).subscribe();

    setTimeout(() => {
      this.isAutoFetching = false;
    }, 15000);
  }

  quickSend(bookId: number) {
    this.emailService.emailBookQuick(bookId).subscribe({
      next: () => this.messageService.add({
        severity: 'info',
        summary: this.translateService.instant('metadata.viewer.toast.sendScheduled.summary'),
        detail: this.translateService.instant('metadata.viewer.toast.sendScheduled.detail'),
      }),
      error: (err) => this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('metadata.viewer.toast.sendFailed.summary'),
        detail: err?.error?.message || this.translateService.instant('metadata.viewer.toast.sendFailed.detail'),
      })
    });
  }

  assignShelf(bookId: number) {
    this.bookDialogHelperService.openShelfAssignerDialog((this.bookService.getBookByIdFromState(bookId) as Book), null);
  }

  updateReadStatus(status: ReadStatus): void {
    if (!status) {
      return;
    }

    this.book$.pipe(take(1)).subscribe(book => {
      if (!book || !book.id) {
        return;
      }

      this.bookService.updateBookReadStatus(book.id, status).subscribe({
        next: (updatedBooks) => {
          this.selectedReadStatus = status;
          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('metadata.viewer.toast.readStatusUpdated.summary'),
            detail: this.translateService.instant('metadata.viewer.toast.readStatusUpdated.detail', {status: this.getStatusLabel(status)}),
            life: 2000
          });
        },
        error: (err) => {
          console.error('Failed to update read status:', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('metadata.viewer.toast.readStatusUpdateFailed.summary'),
            detail: this.translateService.instant('metadata.viewer.toast.readStatusUpdateFailed.detail'),
            life: 3000
          });
        }
      });
    });
  }

  resetProgress(book: Book, type: ResetProgressType): void {
    this.confirmationService.confirm({
      message: this.translateService.instant('metadata.viewer.confirm.resetProgress.message', {title: book.metadata?.title}),
      header: this.translateService.instant('metadata.viewer.confirm.resetProgress.header'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translateService.instant('common.yes'),
      rejectLabel: this.translateService.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.bookService.resetProgress(book.id, type).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: this.translateService.instant('metadata.viewer.toast.progressReset.summary'),
              detail: this.translateService.instant('metadata.viewer.toast.progressReset.detail'),
              life: 1500
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: this.translateService.instant('metadata.viewer.toast.progressResetFailed.summary'),
              detail: this.translateService.instant('metadata.viewer.toast.progressResetFailed.detail'),
              life: 1500
            });
          }
        });
      }
    });
  }

  onPersonalRatingChange(book: Book, {value: personalRating}: RatingRateEvent): void {
    this.bookService.updatePersonalRating(book.id, personalRating).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('metadata.viewer.toast.ratingSaved.summary'),
          detail: this.translateService.instant('metadata.viewer.toast.ratingSaved.detail')
        });
      },
      error: err => {
        console.error('Failed to update personal rating:', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('metadata.viewer.toast.ratingSaveFailed.summary'),
          detail: this.translateService.instant('metadata.viewer.toast.ratingSaveFailed.detail')
        });
      }
    });
  }

  resetPersonalRating(book: Book): void {
    this.bookService.resetPersonalRating(book.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'info',
          summary: this.translateService.instant('metadata.viewer.toast.ratingReset.summary'),
          detail: this.translateService.instant('metadata.viewer.toast.ratingReset.detail')
        });
      },
      error: err => {
        console.error('Failed to reset personal rating:', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('metadata.viewer.toast.ratingResetFailed.summary'),
          detail: this.translateService.instant('metadata.viewer.toast.ratingResetFailed.detail')
        });
      }
    });
  }

  goToAuthorBooks(author: string): void {
    this.handleMetadataClick('author', author);
  }

  goToCategory(category: string): void {
    this.handleMetadataClick('category', category);
  }

  goToMood(mood: string): void {
    this.handleMetadataClick('mood', mood);
  }

  goToTag(tag: string): void {
    this.handleMetadataClick('tag', tag);
  }

  goToSeries(seriesName: string): void {
    const encodedSeriesName = encodeURIComponent(seriesName);
    this.router.navigate(['/series', encodedSeriesName]);
  }

  goToPublisher(publisher: string): void {
    this.handleMetadataClick('publisher', publisher);
  }

  goToLibrary(libraryId: number): void {
    if (this.metadataCenterViewMode === 'dialog') {
      this.dialogRef?.close();
      setTimeout(() => this.router.navigate(['/library', libraryId, 'books']), 200);
    } else {
      this.router.navigate(['/library', libraryId, 'books']);
    }
  }

  goToPublishedYear(publishedDate: string): void {
    const year = this.extractYear(publishedDate);
    if (year) {
      this.handleMetadataClick('publishedDate', year);
    }
  }

  goToLanguage(language: string): void {
    this.handleMetadataClick('language', language);
  }

  goToFileType(filePath: string | undefined): void {
    const fileType = this.getFileExtension(filePath);
    if (fileType) {
      this.handleMetadataClick('bookType', fileType.toUpperCase());
    }
  }

  goToReadStatus(status: ReadStatus): void {
    this.handleMetadataClick('readStatus', status);
  }

  goToPageCountRange(pageCount: number): void {
    const range = pageCountRanges.find(r => pageCount >= r.min && pageCount < r.max);
    if (range) {
      this.handleMetadataClick('pageCount', range.id);
    }
  }

  goToFileSizeRange(fileSizeKb: number): void {
    const range = fileSizeRanges.find(r => fileSizeKb >= r.min && fileSizeKb < r.max);
    if (range) {
      this.handleMetadataClick('fileSize', range.id);
    }
  }

  goToMatchScoreRange(score: number): void {
    const normalizedScore = score > 1 ? score / 100 : score;
    const range = matchScoreRanges.find(r => normalizedScore >= r.min && normalizedScore < r.max);
    if (range) {
      this.handleMetadataClick('matchScore', range.id);
    }
  }

  private extractYear(dateString: string | null | undefined): string | null {
    if (!dateString) return null;
    const yearMatch = dateString.match(/\d{4}/);
    return yearMatch ? yearMatch[0] : null;
  }

  private navigateToFilteredBooks(filterKey: string, filterValue: string): void {
    this.router.navigate(['/all-books'], {
      queryParams: {
        view: 'grid',
        sort: 'title',
        direction: 'asc',
        sidebar: true,
        filter: `${filterKey}:${filterValue}`
      }
    });
  }

  private handleMetadataClick(filterKey: string, filterValue: string): void {
    if (this.metadataCenterViewMode === 'dialog') {
      this.dialogRef?.close();
      setTimeout(() => this.navigateToFilteredBooks(filterKey, filterValue), 200);
    } else {
      this.navigateToFilteredBooks(filterKey, filterValue);
    }
  }

  isMetadataFullyLocked(metadata: BookMetadata): boolean {
    const lockedKeys = Object.keys(metadata).filter(k => k.endsWith('Locked'));
    return lockedKeys.length > 0 && lockedKeys.every(k => metadata[k] === true);
  }

  getFileSizeInMB(fileInfo: FileInfo | null | undefined): string {
    const sizeKb = fileInfo?.fileSizeKb;
    return sizeKb != null
      ? `${(sizeKb / 1024).toFixed(2)} ${this.translateService.instant('metadata.viewer.unit.mb')}`
      : '-';
  }

  getProgressPercent(book: Book): number | null {
    if (book.epubProgress?.percentage != null) {
      return book.epubProgress.percentage;
    }
    if (book.pdfProgress?.percentage != null) {
      return book.pdfProgress.percentage;
    }
    if (book.cbxProgress?.percentage != null) {
      return book.cbxProgress.percentage;
    }
    return null;
  }

  getKoProgressPercent(book: Book): number | null {
    if (book.koreaderProgress?.percentage != null) {
      return book.koreaderProgress.percentage;
    }
    return null;
  }

  getKoboProgressPercent(book: Book): number | null {
    if (book.koboProgress?.percentage != null) {
      return book.koboProgress.percentage;
    }
    return null;
  }

  getProgressCount(book: Book): number {
    let count = 0;
    if (this.getProgressPercent(book) !== null) count++;
    if (this.getKoProgressPercent(book) !== null) count++;
    if (this.getKoboProgressPercent(book) !== null) count++;
    return count;
  }

  getFileExtension(filePath?: string): string | null {
    if (!filePath) return null;
    const parts = filePath.split('.');
    if (parts.length < 2) return null;
    return parts.pop()?.toUpperCase() || null;
  }

  getFileIcon(fileType: string | null): string {
    if (!fileType) return 'pi pi-file';
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'pi pi-file-pdf';
      case 'epub':
      case 'mobi':
      case 'azw3':
        return 'pi pi-book';
      case 'cbz':
      case 'cbr':
      case 'cbx':
        return 'pi pi-image';
      default:
        return 'pi pi-file';
    }
  }

  getFileTypeColor(fileType: string | null | undefined): TagColor {
    if (!fileType) return 'gray';
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'pink';
      case 'epub':
        return 'indigo';
      case 'cbz':
        return 'teal';
      case 'cbr':
        return 'purple';
      case 'cb7':
        return 'blue';
      default:
        return 'gray';
    }
  }

  getStarColorScaled(rating?: number | null, maxScale: number = 5): string {
    if (rating == null) {
      return 'rgb(203, 213, 225)';
    }
    const normalized = rating / maxScale;
    if (normalized >= 0.9) {
      return 'rgb(34, 197, 94)';
    } else if (normalized >= 0.75) {
      return 'rgb(52, 211, 153)';
    } else if (normalized >= 0.6) {
      return 'rgb(234, 179, 8)';
    } else if (normalized >= 0.4) {
      return 'rgb(249, 115, 22)';
    } else {
      return 'rgb(239, 68, 68)';
    }
  }


  getMatchScoreColor(score: number): TagColor {
    if (score >= 0.95) return 'emerald';
    if (score >= 0.90) return 'green';
    if (score >= 0.80) return 'lime';
    if (score >= 0.70) return 'yellow';
    if (score >= 0.60) return 'amber';
    if (score >= 0.50) return 'orange';
    if (score >= 0.40) return 'red';
    if (score >= 0.30) return 'rose';
    return 'pink';
  }

  getStatusColor(status: string | null | undefined): TagColor {
    const normalized = status?.toUpperCase() ?? '';
    switch (normalized) {
      case 'UNREAD':
        return 'gray';
      case 'PAUSED':
        return 'zinc';
      case 'READING':
        return 'blue';
      case 'RE_READING':
        return 'indigo';
      case 'READ':
        return 'green';
      case 'PARTIALLY_READ':
        return 'yellow';
      case 'ABANDONED':
        return 'red';
      case 'WONT_READ':
        return 'pink';
      default:
        return 'gray';
    }
  }

  getProgressColor(progress: number | null | undefined): TagColor {
    if (progress == null) return 'gray';
    return 'blue';
  }

  getKoProgressColor(progress: number | null | undefined): TagColor {
    if (progress == null) return 'gray';
    return 'amber';
  }

  getKOReaderPercentage(book: Book): number | null {
    const p = book?.koreaderProgress?.percentage;
    return p != null ? Math.round(p * 10) / 10 : null;
  }

  getRatingTooltip(book: Book, source: 'amazon' | 'goodreads' | 'hardcover' | 'lubimyczytac' | 'ranobedb'): string {
    const meta = book?.metadata;
    if (!meta) return '';

    switch (source) {
      case 'amazon':
        if (meta.amazonRating == null) return '';
        return `★ ${meta.amazonRating} | ${this.translateService.instant('metadata.viewer.rating.reviews', {count: (meta.amazonReviewCount ?? 0).toLocaleString()})}`;
      case 'goodreads':
        if (meta.goodreadsRating == null) return '';
        return `★ ${meta.goodreadsRating} | ${this.translateService.instant('metadata.viewer.rating.reviews', {count: (meta.goodreadsReviewCount ?? 0).toLocaleString()})}`;
      case 'hardcover':
        if (meta.hardcoverRating == null) return '';
        return `★ ${meta.hardcoverRating} | ${this.translateService.instant('metadata.viewer.rating.reviews', {count: (meta.hardcoverReviewCount ?? 0).toLocaleString()})}`;
      case 'lubimyczytac':
        return meta.lubimyczytacRating != null
          ? `★ ${meta.lubimyczytacRating}`
          : '';
      case 'ranobedb':
        return meta.ranobedbRating != null
          ? `★ ${meta.ranobedbRating}`
          : '';
      default:
        return '';
    }
  }

  getRatingPercent(rating: number | null | undefined): number {
    if (rating == null) return 0;
    return Math.round((rating / 5) * 100);
  }

  getStatusLabel(value: string): string {
    const labelKey = this.readStatusOptions.find(o => o.value === value)?.labelKey ?? 'metadata.viewer.readStatus.unset';
    return this.translateService.instant(labelKey).toUpperCase();
  }


  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const locale = this.translateService.currentLang === 'zh-CN' ? 'zh-CN' : 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  toggleDateFinishedEdit(book: Book): void {
    if (this.isEditingDateFinished) {
      this.isEditingDateFinished = false;
      this.editDateFinished = null;
    } else {
      this.isEditingDateFinished = true;
      this.editDateFinished = book.dateFinished ? new Date(book.dateFinished) : new Date();
    }
  }

  saveDateFinished(book: Book): void {
    if (!book) return;

    const dateToSave = this.editDateFinished ? this.editDateFinished.toISOString() : null;

    this.bookService.updateDateFinished(book.id, dateToSave).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('metadata.viewer.toast.dateUpdated.summary'),
          detail: this.translateService.instant('metadata.viewer.toast.dateUpdated.detail'),
          life: 1500
        });
        this.isEditingDateFinished = false;
        this.editDateFinished = null;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('metadata.viewer.toast.dateUpdateFailed.summary'),
          detail: this.translateService.instant('metadata.viewer.toast.dateUpdateFailed.detail'),
          life: 3000
        });
      }
    });
  }

  cancelDateFinishedEdit(): void {
    this.isEditingDateFinished = false;
    this.editDateFinished = null;
  }

  openFileMoverDialog(bookId: number): void {
    this.bookDialogHelperService.openFileMoverDialog(new Set([bookId]));
  }

  protected readonly ResetProgressTypes = ResetProgressTypes;
  protected readonly ReadStatus = ReadStatus;

  canNavigatePrevious(): boolean {
    return this.bookNavigationService.canNavigatePrevious();
  }

  canNavigateNext(): boolean {
    return this.bookNavigationService.canNavigateNext();
  }

  navigatePrevious(): void {
    const prevBookId = this.bookNavigationService.getPreviousBookId();
    if (prevBookId) {
      this.navigateToBook(prevBookId);
    }
  }

  navigateNext(): void {
    const nextBookId = this.bookNavigationService.getNextBookId();
    if (nextBookId) {
      this.navigateToBook(nextBookId);
    }
  }

  private navigateToBook(bookId: number): void {
    this.bookNavigationService.updateCurrentBook(bookId);
    if (this.metadataCenterViewMode === 'route') {
      this.router.navigate(['/book', bookId], {
        queryParams: {tab: 'view'}
      });
    } else {
      this.metadataHostService.switchBook(bookId);
    }
  }

  getNavigationPosition(): string {
    const position = this.bookNavigationService.getCurrentPosition();
    return position
      ? this.translateService.instant('metadata.viewer.navigation.position', {current: position.current, total: position.total})
      : '';
  }
}
