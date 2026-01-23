import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {DynamicDialogRef} from 'primeng/dynamicdialog';
import {ButtonModule} from 'primeng/button';
import {CheckboxModule} from 'primeng/checkbox';
import {InputTextModule} from 'primeng/inputtext';
import {SelectModule} from 'primeng/select';
import {InputNumberModule} from 'primeng/inputnumber';
import {DashboardConfig, ScrollerConfig, ScrollerType} from '../../models/dashboard-config.model';
import {DashboardConfigService} from '../../services/dashboard-config.service';
import {MagicShelfService} from '../../../magic-shelf/service/magic-shelf.service';
import {map} from 'rxjs/operators';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {Subscription} from 'rxjs';

export const MAX_SCROLLERS = 5;
export const DEFAULT_MAX_ITEMS = 20;
export const MIN_ITEMS = 10;
export const MAX_ITEMS = 20;

@Component({
  selector: 'app-dashboard-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    SelectModule,
    InputNumberModule,
    TranslateModule
  ],
  templateUrl: './dashboard-settings.component.html',
  styleUrls: ['./dashboard-settings.component.scss']
})
export class DashboardSettingsComponent implements OnInit, OnDestroy {
  private configService = inject(DashboardConfigService);
  private dialogRef = inject(DynamicDialogRef);
  private magicShelfService = inject(MagicShelfService);
  private translateService = inject(TranslateService);

  config!: DashboardConfig;

  availableScrollerTypes: Array<{label: string; value: ScrollerType}> = [];

  magicShelves$ = this.magicShelfService.shelvesState$.pipe(
    map(state => (state.shelves || []).map(shelf => ({
      label: shelf.name,
      value: shelf.id!
    })))
  );

  sortFieldOptions: Array<{label: string; value: string}> = [];

  sortDirectionOptions: Array<{label: string; value: string}> = [];

  private magicShelvesMap = new Map<number, string>();
  private langSub?: Subscription;

  readonly MIN_ITEMS = MIN_ITEMS;
  readonly MAX_ITEMS = MAX_ITEMS;

  ngOnInit(): void {
    this.buildTranslatedOptions();
    this.langSub = this.translateService.onLangChange.subscribe(() => {
      this.buildTranslatedOptions();
    });

    this.configService.config$.subscribe(config => {
      this.config = JSON.parse(JSON.stringify(config));
    });

    this.magicShelfService.shelvesState$.subscribe(state => {
      this.magicShelvesMap.clear();
      (state.shelves || []).forEach(shelf => {
        if (shelf.id) {
          this.magicShelvesMap.set(shelf.id, shelf.name);
        }
      });
    });
  }

  private getScrollerTitleKey(scroller: ScrollerConfig): string {
    if (scroller.type === ScrollerType.MAGIC_SHELF && scroller.magicShelfId) {
      return '';
    }

    switch (scroller.type) {
      case ScrollerType.LAST_READ:
        return 'dashboard.scrollerTypes.continueReading';
      case ScrollerType.LATEST_ADDED:
        return 'dashboard.scrollerTypes.recentlyAdded';
      case ScrollerType.RANDOM:
        return 'dashboard.scrollerTypes.discoverSomethingNew';
      default:
        return 'dashboard.scrollerTypes.scroller';
    }
  }

  addScroller(): void {
    if (this.config.scrollers.length >= MAX_SCROLLERS) {
      return;
    }
    const newId = (Math.max(...this.config.scrollers.map((s: ScrollerConfig) => parseInt(s.id)), 0) + 1).toString();
    this.config.scrollers.push({
      id: newId,
      type: ScrollerType.LATEST_ADDED,
      title: '',
      enabled: true,
      order: this.config.scrollers.length + 1,
      maxItems: DEFAULT_MAX_ITEMS
    });
  }

  removeScroller(index: number): void {
    if (this.config.scrollers.length <= 1) {
      return;
    }
    this.config.scrollers.splice(index, 1);
    this.updateOrder();
  }

  onScrollerTypeChange(scroller: ScrollerConfig): void {
    if (scroller.type === ScrollerType.MAGIC_SHELF) {
      scroller.magicShelfId = undefined;
    } else {
      delete scroller.magicShelfId;
    }
  }

  moveUp(index: number): void {
    if (index > 0) {
      [this.config.scrollers[index], this.config.scrollers[index - 1]] =
        [this.config.scrollers[index - 1], this.config.scrollers[index]];
      this.updateOrder();
    }
  }

  moveDown(index: number): void {
    if (index < this.config.scrollers.length - 1) {
      [this.config.scrollers[index], this.config.scrollers[index + 1]] =
        [this.config.scrollers[index + 1], this.config.scrollers[index]];
      this.updateOrder();
    }
  }

  private updateOrder(): void {
    this.config.scrollers.forEach((scroller, index) => {
      scroller.order = index + 1;
    });
  }

  save(): void {
    this.config.scrollers.forEach(scroller => {
      if (scroller.type === ScrollerType.MAGIC_SHELF) {
        scroller.titleKey = undefined;
        scroller.title = scroller.magicShelfId ? (this.magicShelvesMap.get(scroller.magicShelfId) || '') : '';
      } else {
        scroller.titleKey = this.getScrollerTitleKey(scroller);
        scroller.title = '';
      }
    });
    this.configService.saveConfig(this.config);
    this.dialogRef.close();
  }

  cancel(): void {
    this.dialogRef.close();
  }

  resetToDefault(): void {
    this.configService.resetToDefault();
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  private buildTranslatedOptions(): void {
    this.availableScrollerTypes = [
      {label: this.translateService.instant('dashboard.scrollerTypes.continueReading'), value: ScrollerType.LAST_READ},
      {label: this.translateService.instant('dashboard.scrollerTypes.recentlyAdded'), value: ScrollerType.LATEST_ADDED},
      {label: this.translateService.instant('dashboard.scrollerTypes.discoverSomethingNew'), value: ScrollerType.RANDOM},
      {label: this.translateService.instant('dashboard.scrollerTypes.magicShelf'), value: ScrollerType.MAGIC_SHELF}
    ];

    this.sortFieldOptions = [
      {label: this.translateService.instant('dashboard.settings.sortFields.title'), value: 'title'},
      {label: this.translateService.instant('dashboard.settings.sortFields.titleSeries'), value: 'titleSeries'},
      {label: this.translateService.instant('dashboard.settings.sortFields.fileName'), value: 'fileName'},
      {label: this.translateService.instant('dashboard.settings.sortFields.dateAdded'), value: 'addedOn'},
      {label: this.translateService.instant('dashboard.settings.sortFields.author'), value: 'author'},
      {label: this.translateService.instant('dashboard.settings.sortFields.authorSeries'), value: 'authorSeries'},
      {label: this.translateService.instant('dashboard.settings.sortFields.personalRating'), value: 'personalRating'},
      {label: this.translateService.instant('dashboard.settings.sortFields.publisher'), value: 'publisher'},
      {label: this.translateService.instant('dashboard.settings.sortFields.publishedDate'), value: 'publishedDate'},
      {label: this.translateService.instant('dashboard.settings.sortFields.lastRead'), value: 'lastReadTime'},
      {label: this.translateService.instant('dashboard.settings.sortFields.pages'), value: 'pageCount'}
    ];

    this.sortDirectionOptions = [
      {label: this.translateService.instant('dashboard.settings.sortDirections.ascending'), value: 'asc'},
      {label: this.translateService.instant('dashboard.settings.sortDirections.descending'), value: 'desc'}
    ];
  }
}
