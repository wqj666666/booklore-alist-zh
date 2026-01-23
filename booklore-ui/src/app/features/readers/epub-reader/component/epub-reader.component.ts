import {Component, ElementRef, inject, NgZone, OnDestroy, OnInit, ViewChild} from '@angular/core';
import ePub, {Book as EpubJsBook, Location as EpubJsLocation, Navigation as EpubJsNavigation, Rendition as EpubJsRendition, TocItem as EpubJsTocItem} from 'epubjs';
import {Drawer} from 'primeng/drawer';
import {firstValueFrom, forkJoin, Subject, Subscription} from 'rxjs';
import {Button} from 'primeng/button';
import {InputText} from 'primeng/inputtext';
import {CommonModule, Location} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {Book, BookSetting, EpubViewerSetting} from '../../../book/model/book.model';
import {BookService} from '../../../book/service/book.service';
import {Select} from 'primeng/select';
import {UserService} from '../../../settings/user-management/user.service';
import {ProgressSpinner} from 'primeng/progressspinner';
import {MessageService, PrimeTemplate} from 'primeng/api';
import {BookMark, BookMarkService, UpdateBookMarkRequest} from '../../../../shared/service/book-mark.service';
import {Tooltip} from 'primeng/tooltip';
import {Slider} from 'primeng/slider';
import {FALLBACK_EPUB_SETTINGS, getChapter} from '../epub-reader-helper';
import {ReadingSessionService} from '../../../../shared/service/reading-session.service';
import {EpubTheme, EpubThemeUtil} from '../epub-theme-util';
import {PageTitleService} from "../../../../shared/service/page-title.service";
import {Tab, TabList, TabPanel, TabPanels, Tabs} from 'primeng/tabs';
import {IconField} from 'primeng/iconfield';
import {InputIcon} from 'primeng/inputicon';
import {BookmarkEditDialogComponent} from './bookmark-edit-dialog.component';
import {BookmarkViewDialogComponent} from './bookmark-view-dialog.component';
import {CustomFontService} from '../../../../shared/service/custom-font.service';
import {CustomFont} from '../../../../shared/model/custom-font.model';
import {addCustomFontsToDropdown, FontDropdownItem} from '../../../../shared/util/custom-font.util';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {takeUntil} from 'rxjs/operators';

@Component({
  selector: 'app-epub-reader',
  templateUrl: './epub-reader.component.html',
  styleUrls: ['./epub-reader.component.scss'],
  imports: [CommonModule, FormsModule, Drawer, Button, Select, ProgressSpinner, Tooltip, Slider, PrimeTemplate, Tabs, TabList, Tab, TabPanels, TabPanel, IconField, InputIcon, BookmarkEditDialogComponent, BookmarkViewDialogComponent, InputText, TranslateModule],
  standalone: true
})
export class EpubReaderComponent implements OnInit, OnDestroy {
  @ViewChild('epubContainer', {static: false}) epubContainer!: ElementRef;

  isLoading = true;
  chapters: { label: string; href: string; level: number }[] = [];
  currentChapter = '';
  currentChapterHref: string | null = null;
  isDrawerVisible = false;
  isSettingsDrawerVisible = false;
  bookmarks: BookMark[] = [];
  currentCfi: string | null = null;
  isBookmarked = false;
  isAddingBookmark = false;
  isDeletingBookmark = false;
  isEditingBookmark = false;
  private routeSubscription?: Subscription;
  private destroy$ = new Subject<void>();

  filterText = '';
  viewDialogVisible = false;
  selectedBookmark: BookMark | null = null;

  public locationsReady = false;
  public approxProgress = 0;
  public exactProgress = 0;
  public progressPercentage = 0;

  showControls = !this.isMobileDevice();
  showHeader = true;
  private hideControlsTimeout?: number;
  private hideHeaderTimeout?: number;
  private isMouseInTopRegion = false;
  private headerShownByMobileTouch = false;
  private currentIframe: HTMLIFrameElement | null = null;
  private iframeTouchHandler: ((event: TouchEvent) => void) | null = null;
  private iframeClickHandler: ((event: MouseEvent) => void) | null = null;

  editingBookmark: BookMark | null = null;
  showEditBookmarkDialog = false;

  private book!: EpubJsBook;
  private epubArrayBuffer: ArrayBuffer | null = null;
  private rendition!: EpubJsRendition;
  private keyListener: (e: KeyboardEvent) => void = () => undefined;

  fontSize?: number = 100;
  selectedFlow?: string = 'paginated';
  selectedTheme?: string = 'white';
  selectedFontType?: string | null = null;
  selectedSpread?: string = 'double';
  lineHeight?: number;
  letterSpacing?: number;
  selectedCustomFontId?: number | null = null;
  customFonts: CustomFont[] = [];
  customFontsReady = false;
  private customFontBlobUrls = new Map<number, string>();

  fontTypes: FontDropdownItem[] = [];

  themes: {labelKey: string; value: EpubTheme}[] = [
    {labelKey: 'readers.epub.theme.white', value: EpubTheme.WHITE},
    {labelKey: 'readers.epub.theme.black', value: EpubTheme.BLACK},
    {labelKey: 'readers.epub.theme.grey', value: EpubTheme.GREY},
    {labelKey: 'readers.epub.theme.sepia', value: EpubTheme.SEPIA},
    {labelKey: 'readers.epub.theme.green', value: EpubTheme.GREEN},
    {labelKey: 'readers.epub.theme.lavender', value: EpubTheme.LAVENDER},
    {labelKey: 'readers.epub.theme.cream', value: EpubTheme.CREAM},
    {labelKey: 'readers.epub.theme.lightBlue', value: EpubTheme.LIGHT_BLUE},
    {labelKey: 'readers.epub.theme.peach', value: EpubTheme.PEACH},
    {labelKey: 'readers.epub.theme.mint', value: EpubTheme.MINT},
    {labelKey: 'readers.epub.theme.darkSlate', value: EpubTheme.DARK_SLATE},
    {labelKey: 'readers.epub.theme.darkOlive', value: EpubTheme.DARK_OLIVE},
    {labelKey: 'readers.epub.theme.darkPurple', value: EpubTheme.DARK_PURPLE},
    {labelKey: 'readers.epub.theme.darkTeal', value: EpubTheme.DARK_TEAL},
    {labelKey: 'readers.epub.theme.darkBrown', value: EpubTheme.DARK_BROWN},
  ];

  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private userService = inject(UserService);
  private bookService = inject(BookService);
  private messageService = inject(MessageService);
  private ngZone = inject(NgZone);
  private pageTitle = inject(PageTitleService);
  private bookMarkService = inject(BookMarkService);
  private readingSessionService = inject(ReadingSessionService);
  private customFontService = inject(CustomFontService);
  private translate = inject(TranslateService);

  private readonly baseFontTypeKeys: {labelKey: string; value: string | null}[] = [
    {labelKey: 'readers.epub.font.publisherDefault', value: null},
    {labelKey: 'readers.epub.font.serif', value: 'serif'},
    {labelKey: 'readers.epub.font.sansSerif', value: 'sans-serif'},
    {labelKey: 'readers.epub.font.roboto', value: 'roboto'},
    {labelKey: 'readers.epub.font.cursive', value: 'cursive'},
    {labelKey: 'readers.epub.font.monospace', value: 'monospace'},
  ];

  epub!: Book;

  ngOnInit(): void {
    this.rebuildFontTypes();
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.rebuildFontTypes());

    this.routeSubscription = this.route.paramMap.subscribe(async (params) => {
      this.isLoading = true;
      const bookId = +params.get('bookId')!;

      try {
        const fonts = await firstValueFrom(this.customFontService.getUserFonts());
        this.customFonts = fonts;
        await this.customFontService.loadAllFonts(fonts);
        await this.cacheCustomFontsAsBlobs(fonts);
        addCustomFontsToDropdown(fonts, this.fontTypes, 'select');
      } catch (err) {
        console.error('Failed to load custom fonts:', err);
      } finally {
        this.customFontsReady = true;
      }

      const myself$ = this.userService.getMyself();
      const epub$ = this.bookService.getBookByIdFromAPI(bookId, false);
      const epubData$ = this.bookService.getFileContent(bookId);
      const bookSetting$ = this.bookService.getBookSetting(bookId);
      const bookmarks$ = this.bookMarkService.getBookmarksForBook(bookId);

      forkJoin([myself$, epub$, epubData$, bookSetting$, bookmarks$]).subscribe({
        next: ([myself, epub, epubData, bookSetting, bookmarks]) => {
          this.epub = epub;
          this.bookmarks = bookmarks;
          this.updateBookmarkStatus();
          const individualSetting = bookSetting?.epubSettings;
          const fileReader = new FileReader();

          this.pageTitle.setBookPageTitle(epub);

          fileReader.onload = () => {
            this.epubArrayBuffer = fileReader.result as ArrayBuffer;

            const settingScope = myself.userSettings.perBookSetting.epub;
            const globalSettings = myself.userSettings.epubReaderSetting;

            const resolvedFlow = settingScope === 'Global' ? globalSettings.flow : individualSetting?.flow;
            const resolvedFontSize = settingScope === 'Global' ? globalSettings.fontSize : individualSetting?.fontSize;
            const resolvedFontFamily = settingScope === 'Global' ? globalSettings.font : individualSetting?.font;
            const resolvedTheme = settingScope === 'Global' ? globalSettings.theme : individualSetting?.theme;
            const resolvedLineHeight = settingScope === 'Global' ? globalSettings.lineHeight : individualSetting?.lineHeight;
            const resolvedLetterSpacing = settingScope === 'Global' ? globalSettings.letterSpacing : individualSetting?.letterSpacing;
            const resolvedSpread = settingScope === 'Global' ? globalSettings.spread || 'double' : individualSetting?.spread || 'double';
            const resolvedCustomFontId = settingScope === 'Global' ? globalSettings.customFontId : individualSetting?.customFontId;

            if (resolvedTheme != null) this.selectedTheme = resolvedTheme;
            if (resolvedFontFamily != null) this.selectedFontType = resolvedFontFamily;
            if (resolvedFontSize != null) this.fontSize = resolvedFontSize;
            if (resolvedLineHeight != null) this.lineHeight = resolvedLineHeight;
            if (resolvedLetterSpacing != null) this.letterSpacing = resolvedLetterSpacing;
            if (resolvedFlow != null) this.selectedFlow = resolvedFlow;
            if (resolvedSpread != null) this.selectedSpread = resolvedSpread;

            if (resolvedCustomFontId != null) {
              this.selectedFontType = `custom:${resolvedCustomFontId}`;
            }

            this.initBook();
            this.initRendition();
          };

          fileReader.readAsArrayBuffer(epubData);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('readers.toast.errorSummary'),
            detail: this.translate.instant('readers.epub.toast.loadBookFailedFallback'),
          });
          this.isLoading = false;
        },
      });
    });
  }

  private rebuildFontTypes(): void {
    const preserved = this.fontTypes.filter(item =>
      typeof item.value === 'string' && (item.value.startsWith('custom:') || item.value === 'separator')
    );

    this.fontTypes = this.baseFontTypeKeys.map(item => ({
      label: this.translate.instant(item.labelKey),
      value: item.value
    }));

    for (const item of preserved) {
      this.fontTypes.push(item);
    }
  }

  get filteredBookmarks(): BookMark[] {
    let filtered = this.bookmarks;

    if (this.filterText && this.filterText.trim()) {
      const lowerFilter = this.filterText.toLowerCase().trim();
      filtered = filtered.filter(b =>
        (b.title && b.title.toLowerCase().includes(lowerFilter)) ||
        (b.notes && b.notes.toLowerCase().includes(lowerFilter))
      );
    }

    return [...filtered].sort((a, b) => {
      const priorityA = a.priority ?? 3;
      const priorityB = b.priority ?? 3;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return dateB - dateA;
    });
  }

  openViewDialog(bookmark: BookMark): void {
    this.selectedBookmark = bookmark;
    this.viewDialogVisible = true;
  }

  updateThemeStyle(): void {
    this.applyCombinedTheme();
    this.updateViewerSetting();
  }

  changeScrollMode(): void {
    if (!this.rendition || !this.book) return;

    const cfi = this.rendition.currentLocation()?.start?.cfi;
    const locations = this.book.locations.save();

    this.initBook(locations);
    this.initRendition(cfi);
    this.updateViewerSetting();
  }

  changeSpreadMode(): void {
    if (!this.rendition || !this.book || this.selectedFlow === 'scrolled' || this.isMobileDevice()) return;

    const cfi = this.rendition.currentLocation()?.start?.cfi;
    const locations = this.book.locations.save();

    this.initBook(locations);
    this.initRendition(cfi);
    this.updateViewerSetting();
  }

  changeThemes(): void {
    this.applyCombinedTheme();
    this.updateViewerSetting();
  }

  private applyCombinedTheme(): void {
    EpubThemeUtil.applyTheme(
      this.rendition,
      this.selectedTheme ?? 'white',
      this.selectedFontType ?? undefined,
      this.fontSize,
      this.lineHeight,
      this.letterSpacing
    );
  }

  updateFontSize(): void {
    if (this.rendition) {
      this.rendition.themes.override('font-size', `${this.fontSize}%`);
      this.updateViewerSetting();
    }
  }

  async changeFontType(): Promise<void> {
    const result = await this.applyEpubTheme();

    if (!result.success) {
      this.selectedFontType = null;
      this.selectedCustomFontId = null;
    } else if (result.customFontId !== undefined) {
      this.selectedCustomFontId = result.customFontId;
    }

    this.updateViewerSetting();
  }

  private async cacheCustomFontsAsBlobs(fonts: CustomFont[]): Promise<void> {
    const promises = fonts.map(async (font) => {
      try {
        const fontUrl = this.customFontService.getFontUrl(font.id);
        const fontUrlWithToken = this.customFontService.appendToken(fontUrl);
        const response = await fetch(fontUrlWithToken);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        this.customFontBlobUrls.set(font.id, blobUrl);
      } catch (error) {
        console.error(`Failed to cache font ${font.fontName}:`, error);
      }
    });
    await Promise.all(promises);
  }

  private async applyEpubTheme(): Promise<{ success: boolean, customFontId?: number | null }> {
    if (!this.rendition) return {success: false};

    let fontFamily = this.selectedFontType;
    let customFontToInject: CustomFont | null = null;
    let customFontId: number | null = null;

    if (this.selectedFontType?.startsWith('custom:')) {
      const fontId = parseInt(this.selectedFontType.split(':')[1]);
      const customFont = this.customFonts.find(f => f.id === fontId);
      if (customFont) {
        try {
          await this.customFontService.loadFontFace(customFont);
          if (this.customFontService.isFontLoaded(customFont.fontName)) {
            fontFamily = customFont.fontName;
            customFontId = fontId;
            customFontToInject = customFont;
          } else {
            return {success: false};
          }
        } catch (error) {
          console.error('Failed to load custom font:', error);
          this.messageService.add({
            severity: 'warn',
            summary: 'Custom fonts not loaded',
            detail: 'Your custom fonts could not be loaded. The reader will use default fonts instead.',
          });
          return {success: false};
        }
      }
    } else {
      customFontId = null;
    }

    if (customFontToInject) {
      const blobUrl = this.customFontBlobUrls.get(customFontToInject.id);
      if (!blobUrl) {
        console.error('Blob URL not found for custom font');
        return {success: false};
      }
      this.rendition.themes.default({
        '@font-face': [{
          'font-family': `"${customFontToInject.fontName}"`,
          'src': `url(${blobUrl})`,
          'font-weight': 'normal',
          'font-style': 'normal'
        }]
      });
    } else {
      this.rendition.themes.default({});
    }

    if (fontFamily) {
      this.rendition.themes.font(customFontToInject ? `"${fontFamily}"` : fontFamily);
    } else {
      this.rendition.themes.font('');
    }

    const baseTheme = EpubThemeUtil.themesMap.get(this.selectedTheme ?? 'black') || {};
    const combinedTheme = {
      ...baseTheme,
      body: {
        ...baseTheme.body,
        ...(this.lineHeight != null ? {'line-height': this.lineHeight} : {}),
        ...(this.letterSpacing != null ? {'letter-spacing': `${this.letterSpacing}em`} : {}),
      },
      '*': {
        ...baseTheme['*'],
        ...(this.lineHeight != null ? {'line-height': this.lineHeight} : {}),
        ...(this.letterSpacing != null ? {'letter-spacing': `${this.letterSpacing}em`} : {}),
      },
    };

    this.rendition.themes.override('font-size', `${this.fontSize}%`);
    this.rendition.themes.register('custom', combinedTheme);
    this.rendition.themes.select('custom');

    return {success: true, customFontId};
  }

  increaseFontSize(): void {
    this.fontSize = Math.min(Number(this.fontSize) + 10, FALLBACK_EPUB_SETTINGS.maxFontSize);
    this.updateFontSize();
  }

  decreaseFontSize(): void {
    this.fontSize = Math.max(Number(this.fontSize) - 10, FALLBACK_EPUB_SETTINGS.minFontSize);
    this.updateFontSize();
  }

  private updateViewerSetting(): void {
    const epubSettings: Partial<EpubViewerSetting> = {};

    if (this.selectedTheme) epubSettings.theme = this.selectedTheme;
    if (this.selectedFontType) epubSettings.font = this.selectedFontType;
    if (this.fontSize != null) epubSettings.fontSize = this.fontSize;
    if (this.selectedFlow) epubSettings.flow = this.selectedFlow;
    if (this.selectedSpread === 'single' || this.selectedSpread === 'double') epubSettings.spread = this.selectedSpread;
    if (this.lineHeight != null) epubSettings.lineHeight = this.lineHeight;
    if (this.letterSpacing != null) epubSettings.letterSpacing = this.letterSpacing;
    if (this.selectedCustomFontId != null) epubSettings.customFontId = this.selectedCustomFontId;

    const bookSetting: BookSetting = {
      epubSettings: epubSettings as EpubViewerSetting
    };

    this.bookService.updateViewerSetting(bookSetting, this.epub.id).subscribe();
  }

  private setupKeyListener(): void {
    this.keyListener = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          this.prevPage();
          break;
        case 'ArrowRight':
          this.nextPage();
          break;
        default:
          break;
      }
    };
    if (this.rendition) {
      this.rendition.on('keyup', this.keyListener);
    }
    document.addEventListener('keyup', this.keyListener);
  }

  private setupTouchListener(): void {
    if (!this.isMobileDevice()) return;

    const container = this.epubContainer.nativeElement;

    container.addEventListener('touchend', (event: TouchEvent) => {
      event.stopPropagation();
      this.ngZone.run(() => {
        this.handleTouchEnd(event);
      });
    }, {passive: false});

    container.addEventListener('click', (event: MouseEvent) => {
      event.stopPropagation();
      this.ngZone.run(() => {
        this.handleClickAsTap(event);
      });
    }, {capture: true});

    this.rendition.on('rendered', () => {
      const iframe = this.epubContainer.nativeElement.querySelector('iframe');

      if (iframe && iframe !== this.currentIframe) {
        if (this.currentIframe && this.currentIframe.contentDocument) {
          if (this.iframeTouchHandler) {
            this.currentIframe.contentDocument.removeEventListener('touchend', this.iframeTouchHandler, true);
          }
          if (this.iframeClickHandler) {
            this.currentIframe.contentDocument.removeEventListener('click', this.iframeClickHandler, true);
          }
        }

        this.currentIframe = iframe;

        if (iframe.contentDocument) {
          this.iframeTouchHandler = (event: TouchEvent) => {
            event.stopPropagation();
            event.preventDefault();
            this.ngZone.run(() => {
              this.handleTouchEnd(event);
            });
          };

          this.iframeClickHandler = (event: MouseEvent) => {
            event.stopPropagation();
            event.preventDefault();
            this.ngZone.run(() => {
              this.handleClickAsTap(event);
            });
          };

          iframe.contentDocument.addEventListener('touchend', this.iframeTouchHandler, {passive: false, capture: true});
          iframe.contentDocument.addEventListener('click', this.iframeClickHandler, {capture: true});
        }
      }
    });
  }

  public handleTouchEnd(event: TouchEvent): void {
    if (!this.isMobileDevice()) return;

    const touch = event.changedTouches[0];
    let touchX = touch.clientX;
    let touchY = touch.clientY;

    if (event.target && (event.target as HTMLElement).ownerDocument !== document) {
      const iframe = this.currentIframe;
      if (iframe) {
        const iframeRect = iframe.getBoundingClientRect();
        touchX = touch.clientX + iframeRect.left;
        touchY = touch.clientY + iframeRect.top;
      }
    }

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const isTopTouch = touchY < screenHeight * 0.2;
    const isInTapZoneVertically = touchY >= screenHeight * 0.2;

    if (isTopTouch) {
      if (!this.showHeader) {
        this.showHeader = true;
        this.headerShownByMobileTouch = true;
        this.clearHeaderTimeout();
        this.startHeaderAutoHide();
      } else if (this.headerShownByMobileTouch) {
        this.showHeader = false;
        this.headerShownByMobileTouch = false;
        this.clearHeaderTimeout();
      }
      return;
    }

    if (isInTapZoneVertically) {
      const leftZoneEnd = screenWidth / 3;
      const rightZoneStart = screenWidth * (2 / 3);

      if (touchX < leftZoneEnd) {
        this.prevPage();
        return;
      }

      if (touchX > rightZoneStart) {
        this.nextPage();
        return;
      }

      this.showControlsTemporarily();
    }
  }

  private handleClickAsTap(event: MouseEvent): void {
    if (!this.isMobileDevice()) return;

    let clickX = event.clientX;
    let clickY = event.clientY;

    if (event.target && (event.target as HTMLElement).ownerDocument !== document) {
      const iframe = this.currentIframe;
      if (iframe) {
        const iframeRect = iframe.getBoundingClientRect();
        clickX = event.clientX + iframeRect.left;
        clickY = event.clientY + iframeRect.top;
      }
    }

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const isTopClick = clickY < screenHeight * 0.2;
    const isInTapZoneVertically = clickY >= screenHeight * 0.2;

    if (isTopClick) {
      if (!this.showHeader) {
        this.showHeader = true;
        this.headerShownByMobileTouch = true;
        this.clearHeaderTimeout();
        this.startHeaderAutoHide();
      } else if (this.headerShownByMobileTouch) {
        this.showHeader = false;
        this.headerShownByMobileTouch = false;
        this.clearHeaderTimeout();
      }
      return;
    }

    if (isInTapZoneVertically) {
      const leftZoneEnd = screenWidth / 3;
      const rightZoneStart = screenWidth * (2 / 3);

      if (clickX < leftZoneEnd) {
        this.prevPage();
        return;
      }

      if (clickX > rightZoneStart) {
        this.nextPage();
        return;
      }

      this.showControlsTemporarily();
    }
  }

  closeReader(): void {
    if (this.readingSessionService.isSessionActive()) {
      this.readingSessionService.endSession(
        this.currentCfi || undefined,
        this.progressPercentage
      );
    }
    this.location.back();
  }

  toggleDrawer(): void {
    this.isDrawerVisible = !this.isDrawerVisible;
    if (this.isDrawerVisible) {
      this.clearHeaderTimeout();
    } else {
      this.startHeaderAutoHide();
    }
  }

  toggleSettingsDrawer(): void {
    this.isSettingsDrawerVisible = !this.isSettingsDrawerVisible;
    if (this.isSettingsDrawerVisible) {
      this.clearHeaderTimeout();
    } else {
      this.startHeaderAutoHide();
    }
  }

  navigateToChapter(chapter: { label: string; href: string; level: number }): void {
    if (this.rendition) {
      this.rendition.display(chapter.href).then(() => {
        const location = this.rendition.currentLocation();
        this.readingSessionService.updateProgress(
          location?.start?.cfi,
          this.progressPercentage
        );
      });
    }
  }

  prevPage(): void {
    if (this.rendition) {
      this.rendition.prev();
    }
  }

  nextPage(): void {
    if (this.rendition) {
      this.rendition.next();
    }
  }

  isMobileDevice(): boolean {
    return window.innerWidth <= 768;
  }

  private trackProgress(): void {
    if (!this.book || !this.rendition) return;
    this.rendition.on('relocated', (location: EpubJsLocation) => {
      this.updateCurrentChapter(location);
      const cfi = location.end.cfi;
      this.currentCfi = location.start.cfi;
      this.updateBookmarkStatus();
      const currentIndex = location.start.index;
      const totalSpineItems = this.book.spine.items.length;
      let percentage: number;

      if (this.locationsReady && this.book.locations.total > 0) {
        percentage = this.book.locations.percentageFromCfi(cfi);
        this.exactProgress = Math.round(percentage * 1000) / 10;
        this.progressPercentage = Math.round(percentage * 1000) / 10;
      } else {
        if (totalSpineItems > 0) {
          percentage = (currentIndex + 1) / totalSpineItems;
        } else {
          percentage = 0;
        }
        this.approxProgress = Math.round(percentage * 1000) / 10;
        this.progressPercentage = Math.round(percentage * 1000) / 10;
      }

      this.bookService.saveEpubProgress(this.epub.id, cfi, Math.round(percentage * 1000) / 10).subscribe();

      this.readingSessionService.updateProgress(
        location.start.cfi,
        this.progressPercentage
      );
    });

    this.book.ready.then(() => {
      if (this.locationsReady && this.book.locations.total > 0) {
        return Promise.resolve();
      }
      return this.book.locations.generate(1600);
    }).then(() => {
      this.locationsReady = true;
      const location = this.rendition.currentLocation();
      if (location) {
        const cfi = location.end.cfi;
        const percentage = this.book.locations.percentageFromCfi(cfi);
        this.progressPercentage = Math.round(percentage * 1000) / 10;

        this.readingSessionService.startSession(this.epub.id, "EPUB", location.start.cfi, this.progressPercentage);
      }
    }).catch(() => {
      this.locationsReady = false;
      const location = this.rendition.currentLocation();
      if (location) {
        this.readingSessionService.startSession(this.epub.id, "EPUB", location.start.cfi, this.progressPercentage);
      }
    });
  }

  private initBook(restoreLocations?: string): void {
    if (!this.epubArrayBuffer) return;

    if (this.book) {
      this.book.destroy();
    }

    this.book = ePub(this.epubArrayBuffer);

    this.book.loaded.navigation.then((nav: EpubJsNavigation) => {
      this.chapters = this.extractChapters(nav.toc, 0);
    });

    if (restoreLocations) {
      this.book.ready.then(() => {
        this.book.locations.load(restoreLocations);
        this.locationsReady = true;
      });
    } else {
      this.locationsReady = false;
    }
  }

  private initRendition(targetCfi?: string): void {
    if (!this.book) return;

    if (this.rendition) {
      try {
        this.rendition.destroy();
      } catch (e) {
        console.warn('Error destroying rendition', e);
      }
    }

    this.rendition = this.book.renderTo(this.epubContainer.nativeElement, {
      flow: this.selectedFlow ?? 'paginated',
      manager: this.selectedFlow === 'scrolled' ? 'continuous' : 'default',
      width: '100%',
      height: '100%',
      spread: this.selectedFlow === 'paginated' && !this.isMobileDevice() ? (this.selectedSpread === 'single' ? 'none' : this.selectedSpread) : 'none',
      allowScriptedContent: true,
    });

    const baseTheme = EpubThemeUtil.themesMap.get(this.selectedTheme ?? 'black') || {};
    const combinedTheme = {
      ...baseTheme,
      body: {
        ...(baseTheme.body || {}),
        ...(this.lineHeight != null ? {'line-height': this.lineHeight} : {}),
        ...(this.letterSpacing != null ? {'letter-spacing': `${this.letterSpacing}em`} : {}),
      },
      '*': {
        ...(baseTheme['*'] || {}),
        ...(this.lineHeight != null ? {'line-height': this.lineHeight} : {}),
        ...(this.letterSpacing != null ? {'letter-spacing': `${this.letterSpacing}em`} : {}),
      },
    };

    this.rendition.themes.override('font-size', `${this.fontSize}%`);
    this.rendition.themes.register('custom', combinedTheme);
    this.rendition.themes.select('custom');

    const displayPromise = targetCfi
      ? this.rendition.display(targetCfi)
      : (this.epub?.epubProgress?.cfi ? this.rendition.display(this.epub.epubProgress.cfi) : this.rendition.display());

    displayPromise.then(async () => {
      const result = await this.applyEpubTheme();

      if (!result.success) {
        this.selectedFontType = null;
        this.selectedCustomFontId = null;
      } else if (result.customFontId !== undefined) {
        this.selectedCustomFontId = result.customFontId;
      }

      this.updateCurrentChapter(this.rendition.currentLocation());
      this.setupKeyListener();
      this.trackProgress();
      this.setupTouchListener();
      this.isLoading = false;
      this.startHeaderAutoHide();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.readingSessionService.isSessionActive()) {
      this.readingSessionService.endSession(
        this.currentCfi || undefined,
        this.progressPercentage
      );
    }

    this.customFontBlobUrls.forEach(url => URL.revokeObjectURL(url));
    this.customFontBlobUrls.clear();

    this.routeSubscription?.unsubscribe();

    if (this.currentIframe && this.currentIframe.contentDocument) {
      if (this.iframeTouchHandler) {
        this.currentIframe.contentDocument.removeEventListener('touchend', this.iframeTouchHandler, true);
      }
      if (this.iframeClickHandler) {
        this.currentIframe.contentDocument.removeEventListener('click', this.iframeClickHandler, true);
      }
    }

    if (this.rendition) {
      this.rendition.off('keyup', this.keyListener);
    }
    document.removeEventListener('keyup', this.keyListener);

    if (this.hideControlsTimeout) {
      window.clearTimeout(this.hideControlsTimeout);
    }

    this.clearHeaderTimeout();
  }

  selectTheme(themeKey: string): void {
    this.selectedTheme = themeKey;
    this.changeThemes();
  }

  getThemeColor(themeKey: string | undefined): string {
    return EpubThemeUtil.getThemeColor(themeKey);
  }

  onBookClick(event: MouseEvent): void {

    const clickY = event.clientY;
    const screenHeight = window.innerHeight;

    if (this.isMobileDevice()) {
      this.handleClickAsTap(event);
    } else {
      const isTopClick = clickY < screenHeight * 0.1;
      if (isTopClick) {
        this.showHeader = true;
        this.startHeaderAutoHide();
      }
    }
  }

  onHeaderZoneEnter(): void {
    if (this.isMobileDevice()) return;
    this.isMouseInTopRegion = true;
    this.showHeader = true;
    this.clearHeaderTimeout();
  }

  onHeaderZoneLeave(): void {
    if (this.isMobileDevice()) return;
    this.isMouseInTopRegion = false;
    this.startHeaderAutoHide();
  }

  onHeaderZoneClick(): void {
    if (!this.showHeader) {
      this.showHeader = true;
      this.clearHeaderTimeout();
    }
  }

  onBookMouseMove(event: MouseEvent): void {
    if (this.isDrawerVisible || this.isSettingsDrawerVisible || this.isMobileDevice()) {
      return;
    }

    const mouseY = event.clientY;
    const screenHeight = window.innerHeight;
    const isInTopRegion = mouseY < screenHeight * 0.1;

    if (isInTopRegion && !this.isMouseInTopRegion) {
      this.isMouseInTopRegion = true;
      this.showHeader = true;
      this.clearHeaderTimeout();
    } else if (!isInTopRegion && this.isMouseInTopRegion) {
      this.isMouseInTopRegion = false;
      this.startHeaderAutoHide();
    }
  }

  onBookTouch(event?: TouchEvent): void {
    if (this.isMobileDevice()) {
      if (event) {
        this.handleTouchEnd(event);
      } else {
        this.showControlsTemporarily();
      }
    }
  }

  private showControlsTemporarily(): void {
    this.showControls = true;
    this.showHeader = true;
    this.headerShownByMobileTouch = false;
    this.clearHeaderTimeout();

    if (this.hideControlsTimeout) {
      window.clearTimeout(this.hideControlsTimeout);
    }

    this.hideControlsTimeout = window.setTimeout(() => {
      this.ngZone.run(() => {
        this.showControls = false;
        if (!this.isDrawerVisible && !this.isSettingsDrawerVisible) {
          this.showHeader = false;
        }
      });
    }, 2000);
  }

  startHeaderAutoHide(): void {
    this.clearHeaderTimeout();

    if (this.isDrawerVisible || this.isSettingsDrawerVisible || this.isMouseInTopRegion) {
      return;
    }

    this.hideHeaderTimeout = window.setTimeout(() => {
      this.ngZone.run(() => {
        if (!this.isDrawerVisible && !this.isSettingsDrawerVisible && !this.isMouseInTopRegion) {
          this.showHeader = false;
          this.headerShownByMobileTouch = false;
        }
      });
    }, this.isMobileDevice() ? 2000 : 1000);
  }

  private clearHeaderTimeout(): void {
    if (this.hideHeaderTimeout) {
      window.clearTimeout(this.hideHeaderTimeout);
      this.hideHeaderTimeout = undefined;
    }
  }

  private updateCurrentChapter(location: EpubJsLocation | null): void {
    if (!location) return;
    const chapter = getChapter(this.book, location);
    if (chapter) {
      if (chapter.label) {
        this.currentChapter = chapter.label;
      }
      this.currentChapterHref = chapter.href;
    }
  }

  private extractChapters(toc: EpubJsTocItem[], level: number): { label: string; href: string; level: number }[] {
    const chapters: { label: string; href: string; level: number }[] = [];

    for (const item of toc) {
      chapters.push({
        label: item.label,
        href: item.href,
        level: level
      });

      if (item.subitems && item.subitems.length > 0) {
        chapters.push(...this.extractChapters(item.subitems, level + 1));
      }
    }

    return chapters;
  }

  addBookmark(): void {
    if (!this.currentCfi || this.isAddingBookmark) {
      return;
    }

    if (this.isCurrentLocationBookmarked()) {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('readers.toast.infoSummary'),
        detail: this.translate.instant('readers.epub.toast.bookmarkAlreadyExists'),
      });
      return;
    }

    this.isAddingBookmark = true;
    const title = this.currentChapter || this.translate.instant('readers.epub.bookmarks.untitled');
    const request = {
      bookId: this.epub.id,
      cfi: this.currentCfi,
      title: title
    };

    this.bookMarkService.createBookmark(request).subscribe({
      next: (bookmark) => {
        this.bookmarks.push(bookmark);
        this.bookmarks = [...this.bookmarks];
        this.updateBookmarkStatus();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('readers.toast.successSummary'),
          detail: this.translate.instant('readers.epub.toast.bookmarkCreated'),
        });
        this.isAddingBookmark = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('readers.toast.errorSummary'),
          detail: this.translate.instant('readers.epub.toast.bookmarkCreateFailed'),
        });
        this.isAddingBookmark = false;
      },
    });
  }

  deleteBookmark(bookmarkId: number): void {
    if (this.isDeletingBookmark) {
      return;
    }
    if (!confirm(this.translate.instant('readers.epub.confirm.deleteBookmark'))) {
      return;
    }

    this.isDeletingBookmark = true;
    this.bookMarkService.deleteBookmark(bookmarkId).subscribe({
      next: () => {
        this.bookmarks = this.bookmarks.filter(b => b.id !== bookmarkId);
        this.updateBookmarkStatus();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('readers.toast.successSummary'),
          detail: this.translate.instant('readers.epub.toast.bookmarkDeleted'),
        });
        this.isDeletingBookmark = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('readers.toast.errorSummary'),
          detail: this.translate.instant('readers.epub.toast.bookmarkDeleteFailed'),
        });
        this.isDeletingBookmark = false;
      },
    });
  }

  navigateToBookmark(bookmark: BookMark): void {
    if (this.rendition && bookmark.cfi) {
      this.rendition.display(bookmark.cfi).then(() => {
        const location = this.rendition.currentLocation();
        this.readingSessionService.updateProgress(
          location?.start?.cfi,
          this.progressPercentage
        );
      });
    }
  }

  isCurrentLocationBookmarked(): boolean {
    if (!this.currentCfi) return false;
    return this.bookmarks.some(b => b.cfi === this.currentCfi);
  }

  private updateBookmarkStatus(): void {
    this.isBookmarked = this.currentCfi
      ? this.bookmarks.some(b => b.cfi === this.currentCfi)
      : false;
  }

  openEditBookmarkDialog(bookmark: BookMark): void {
    this.editingBookmark = {...bookmark};
    this.showEditBookmarkDialog = true;
  }

  onBookmarkSave(updateRequest: UpdateBookMarkRequest): void {
    if (!this.editingBookmark || this.isEditingBookmark) {
      return;
    }

    this.isEditingBookmark = true;

    this.bookMarkService.updateBookmark(this.editingBookmark.id, updateRequest).subscribe({
      next: (updatedBookmark) => {
        const index = this.bookmarks.findIndex(b => b.id === this.editingBookmark!.id);
        if (index !== -1) {
          this.bookmarks[index] = updatedBookmark;
          this.bookmarks = [...this.bookmarks];
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('readers.toast.successSummary'),
          detail: this.translate.instant('readers.epub.toast.bookmarkUpdated'),
        });
        this.showEditBookmarkDialog = false;
        this.editingBookmark = null;
        this.isEditingBookmark = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('readers.toast.errorSummary'),
          detail: this.translate.instant('readers.epub.toast.bookmarkUpdateFailed'),
        });
        this.showEditBookmarkDialog = false;
        this.editingBookmark = null;
        this.isEditingBookmark = false;
      }
    });
  }

  onBookmarkCancel(): void {
    this.showEditBookmarkDialog = false;
    this.editingBookmark = null;
  }
}
