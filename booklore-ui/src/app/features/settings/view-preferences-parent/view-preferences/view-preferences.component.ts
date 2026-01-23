import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {Button} from 'primeng/button';

import {MessageService} from 'primeng/api';
import {Select} from 'primeng/select';
import {TableModule} from 'primeng/table';
import {User, UserService} from '../../user-management/user.service';
import {LibraryService} from '../../../book/service/library.service';
import {ShelfService} from '../../../book/service/shelf.service';
import {MagicShelfService} from '../../../magic-shelf/service/magic-shelf.service';
import {combineLatest, Subject} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {ToastModule} from 'primeng/toast';
import {Tooltip} from 'primeng/tooltip';
import {filter, take, takeUntil} from 'rxjs/operators';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-view-preferences',
  standalone: true,
  imports: [
    Select,
    FormsModule,
    Button,
    TableModule,
    ToastModule,
    Tooltip,
    TranslateModule
  ],
  templateUrl: './view-preferences.component.html',
  styleUrl: './view-preferences.component.scss'
})
export class ViewPreferencesComponent implements OnInit, OnDestroy {
  sortOptions: {label: string; field: string}[] = [];

  entityTypeOptions: {label: string; value: 'LIBRARY' | 'SHELF' | 'MAGIC_SHELF'}[] = [];

  sortDirectionOptions: {label: string; value: 'ASC' | 'DESC'}[] = [];

  viewModeOptions: {label: string; value: 'GRID' | 'TABLE'}[] = [];

  libraryOptions: { label: string; value: number }[] = [];
  shelfOptions: { label: string; value: number }[] = [];
  magicShelfOptions: { label: string; value: number }[] = [];

  selectedSort: string = 'title';
  selectedSortDir: 'ASC' | 'DESC' = 'ASC';
  selectedView: 'GRID' | 'TABLE' = 'GRID';

  overrides: {
    entityType: 'LIBRARY' | 'SHELF' | 'MAGIC_SHELF';
    library: number;
    sort: string;
    sortDir: 'ASC' | 'DESC';
    view: 'GRID' | 'TABLE';
  }[] = [];

  private user: User | null = null;
  private readonly destroy$ = new Subject<void>();

  private libraryService = inject(LibraryService);
  private shelfService = inject(ShelfService);
  private magicShelfService = inject(MagicShelfService);
  private userService = inject(UserService);
  private messageService = inject(MessageService);
  private translateService = inject(TranslateService);

  ngOnInit(): void {
    this.rebuildStaticOptions();
    this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => this.rebuildStaticOptions());

    combineLatest([
      this.userService.userState$.pipe(filter(userState => !!userState?.user && userState.loaded), take(1)),
      this.libraryService.libraryState$.pipe(filter(libraryState => !!libraryState?.libraries && libraryState.loaded), take(1)),
      this.shelfService.shelfState$.pipe(filter(shelfState => !!shelfState?.shelves && shelfState.loaded), take(1)),
      this.magicShelfService.shelvesState$.pipe(filter(magicState => !!magicState?.shelves && magicState.loaded), take(1))
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([userState, librariesState, shelfState, magicState]) => {

      this.user = userState.user;
      const prefs = userState.user?.userSettings?.entityViewPreferences;
      const global = prefs?.global;
      this.selectedSort = global?.sortKey ?? 'title';
      this.selectedSortDir = global?.sortDir ?? 'ASC';
      this.selectedView = global?.view ?? 'GRID';

      this.overrides = (prefs?.overrides ?? []).map(o => ({
        entityType: o.entityType,
        library: o.entityId,
        sort: o.preferences.sortKey,
        sortDir: o.preferences.sortDir ?? 'ASC',
        view: o.preferences.view ?? 'GRID'
      }));

      this.libraryOptions = (librariesState.libraries ?? []).filter(lib => lib.id !== undefined).map(lib => ({
        label: lib.name,
        value: lib.id!
      }));

      this.shelfOptions = (shelfState?.shelves ?? []).filter(s => s.id !== undefined).map(s => ({
        label: s.name,
        value: s.id!
      }));

      this.magicShelfOptions = (magicState?.shelves ?? []).filter(s => s.id !== undefined).map(s => ({
        label: s.name,
        value: s.id!
      }));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getAvailableEntities(index: number, type: 'LIBRARY' | 'SHELF' | 'MAGIC_SHELF') {
    const selected = this.overrides.map((o, i) => i !== index ? o.library : null);
    let source: { label: string; value: number }[];
    switch (type) {
      case 'LIBRARY':
        source = this.libraryOptions;
        break;
      case 'SHELF':
        source = this.shelfOptions;
        break;
      case 'MAGIC_SHELF':
        source = this.magicShelfOptions;
        break;
      default:
        source = [];
    }
    return source.filter(opt => !selected.includes(opt.value) || this.overrides[index]?.library === opt.value);
  }

  get availableLibraries() {
    const used = new Set(this.overrides.map(o => `${o.entityType}_${o.library}`));

    const withEntityType = (options: { label: string; value: number }[], entityType: 'LIBRARY' | 'SHELF' | 'MAGIC_SHELF') =>
      options.map(opt => ({...opt, entityType}));

    return [...withEntityType(this.libraryOptions, 'LIBRARY'),
            ...withEntityType(this.shelfOptions, 'SHELF'),
            ...withEntityType(this.magicShelfOptions, 'MAGIC_SHELF')]
      .filter(opt => !used.has(`${opt.entityType}_${opt.value}`));
  }

  addOverride(): void {
    const next = this.availableLibraries[0];
    if (next) {
      this.overrides.push({
        entityType: next.entityType,
        library: next.value,
        sort: 'title',
        sortDir: 'ASC',
        view: 'GRID'
      });
    }
  }

  removeOverride(index: number): void {
    this.overrides.splice(index, 1);
  }

  saveSettings(): void {
    if (!this.user) return;

    const prefs = structuredClone(this.user.userSettings.entityViewPreferences ?? {});

    prefs.global = {
      ...prefs.global,
      sortKey: this.selectedSort,
      sortDir: this.selectedSortDir,
      view: this.selectedView
    };

    prefs.overrides = this.overrides.map(o => {
      const existing = prefs.overrides?.find(p =>
        p.entityId === o.library && p.entityType === o.entityType
      )?.preferences;

      return {
        entityType: o.entityType,
        entityId: o.library,
        preferences: {
          sortKey: o.sort,
          sortDir: o.sortDir,
          view: o.view,
          coverSize: existing?.coverSize ?? 1.0,
          seriesCollapsed: existing?.seriesCollapsed ?? false
        }
      };
    });

    this.userService.updateUserSetting(this.user.id, 'entityViewPreferences', prefs);

    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('settings.viewPreferences.toast.saved.summary'),
      detail: this.translateService.instant('settings.viewPreferences.toast.saved.detail')
    });
  }

  private rebuildStaticOptions(): void {
    this.sortOptions = [
      {label: this.translateService.instant('settings.viewPreferences.sortOption.title'), field: 'title'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.titleSeries'), field: 'titleSeries'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.fileName'), field: 'fileName'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.author'), field: 'author'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.authorSeries'), field: 'authorSeries'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.lastReadTime'), field: 'lastReadTime'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.addedOn'), field: 'addedOn'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.fileSizeKb'), field: 'fileSizeKb'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.locked'), field: 'locked'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.publisher'), field: 'publisher'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.publishedDate'), field: 'publishedDate'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.amazonRating'), field: 'amazonRating'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.amazonReviewCount'), field: 'amazonReviewCount'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.goodreadsRating'), field: 'goodreadsRating'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.goodreadsReviewCount'), field: 'goodreadsReviewCount'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.hardcoverRating'), field: 'hardcoverRating'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.hardcoverReviewCount'), field: 'hardcoverReviewCount'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.ranobedbRating'), field: 'ranobedbRating'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.pageCount'), field: 'pageCount'},
      {label: this.translateService.instant('settings.viewPreferences.sortOption.random'), field: 'random'},
    ];

    this.entityTypeOptions = [
      {label: this.translateService.instant('settings.viewPreferences.entityType.library'), value: 'LIBRARY'},
      {label: this.translateService.instant('settings.viewPreferences.entityType.shelf'), value: 'SHELF'},
      {label: this.translateService.instant('settings.viewPreferences.entityType.magicShelf'), value: 'MAGIC_SHELF'}
    ];

    this.sortDirectionOptions = [
      {label: this.translateService.instant('settings.viewPreferences.sortDirection.ascending'), value: 'ASC'},
      {label: this.translateService.instant('settings.viewPreferences.sortDirection.descending'), value: 'DESC'}
    ];

    this.viewModeOptions = [
      {label: this.translateService.instant('settings.viewPreferences.viewMode.grid'), value: 'GRID'},
      {label: this.translateService.instant('settings.viewPreferences.viewMode.table'), value: 'TABLE'}
    ];
  }
}
