import {inject, Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {MessageService} from 'primeng/api';
import {TableColumnPreference, UserService} from '../../../settings/user-management/user.service';
import {TranslateService} from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class TableColumnPreferenceService {
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly translateService = inject(TranslateService);

  private readonly preferencesSubject = new BehaviorSubject<TableColumnPreference[]>([]);
  readonly preferences$ = this.preferencesSubject.asObservable();

  private readonly allAvailableColumns = [
    {field: 'readStatus', headerKey: 'book.table.column.readStatus'},
    {field: 'title', headerKey: 'book.table.column.title'},
    {field: 'authors', headerKey: 'book.table.column.authors'},
    {field: 'publisher', headerKey: 'book.table.column.publisher'},
    {field: 'seriesName', headerKey: 'book.table.column.seriesName'},
    {field: 'seriesNumber', headerKey: 'book.table.column.seriesNumber'},
    {field: 'categories', headerKey: 'book.table.column.categories'},
    {field: 'publishedDate', headerKey: 'book.table.column.publishedDate'},
    {field: 'lastReadTime', headerKey: 'book.table.column.lastReadTime'},
    {field: 'addedOn', headerKey: 'book.table.column.addedOn'},
    {field: 'fileSizeKb', headerKey: 'book.table.column.fileSizeKb'},
    {field: 'language', headerKey: 'book.table.column.language'},
    {field: 'isbn', headerKey: 'book.table.column.isbn'},
    {field: 'pageCount', headerKey: 'book.table.column.pageCount'},
    {field: 'amazonRating', headerKey: 'book.table.column.amazonRating'},
    {field: 'amazonReviewCount', headerKey: 'book.table.column.amazonReviewCount'},
    {field: 'goodreadsRating', headerKey: 'book.table.column.goodreadsRating'},
    {field: 'goodreadsReviewCount', headerKey: 'book.table.column.goodreadsReviewCount'},
    {field: 'hardcoverRating', headerKey: 'book.table.column.hardcoverRating'},
    {field: 'hardcoverReviewCount', headerKey: 'book.table.column.hardcoverReviewCount'},
    {field: 'ranobedbRating', headerKey: 'book.table.column.ranobedbRating'},
  ];

  private readonly fallbackPreferences: TableColumnPreference[] = this.allAvailableColumns.map((col, index) => ({
    field: col.field,
    visible: true,
    order: index
  }));

  initPreferences(savedPrefs: TableColumnPreference[] | undefined): void {
    const effectivePrefs = savedPrefs?.length ? savedPrefs : this.fallbackPreferences;
    this.preferencesSubject.next(this.mergeWithAllColumns(effectivePrefs));
  }

  get allColumns(): { field: string; header: string }[] {
    return this.allAvailableColumns.map(col => ({
      field: col.field,
      header: this.translateService.instant(col.headerKey)
    }));
  }

  get visibleColumns(): { field: string; header: string }[] {
    return this.preferencesSubject.value
      .filter(pref => pref.visible)
      .sort((a, b) => a.order - b.order)
      .map(pref => ({
        field: pref.field,
        header: this.getColumnHeader(pref.field)
      }));
  }

  get preferences(): TableColumnPreference[] {
    return this.preferencesSubject.value;
  }

  saveVisibleColumns(selectedColumns: { field: string }[]): void {
    const selectedFieldSet = new Set(selectedColumns.map(c => c.field));

    const updatedPreferences: TableColumnPreference[] = this.allAvailableColumns.map((col, index) => {
      const selectionIndex = selectedColumns.findIndex(c => c.field === col.field);
      return {
        field: col.field,
        visible: selectedFieldSet.has(col.field),
        order: selectionIndex >= 0 ? selectionIndex : index
      };
    });

    this.preferencesSubject.next(updatedPreferences);

    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) return;

    this.userService.updateUserSetting(currentUser.id, 'tableColumnPreference', updatedPreferences);

    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('book.browser.columns.toast.preferencesSaved.summary'),
      detail: this.translateService.instant('book.browser.columns.toast.preferencesSaved.detail'),
      life: 1500
    });
  }

  private getColumnHeader(field: string): string {
    const headerKey = this.allAvailableColumns.find(col => col.field === field)?.headerKey;
    return headerKey ? this.translateService.instant(headerKey) : field;
  }

  private mergeWithAllColumns(savedPrefs: TableColumnPreference[]): TableColumnPreference[] {
    const savedPrefMap = new Map(savedPrefs.map(p => [p.field, p]));

    return this.allAvailableColumns.map((col, index) => {
      const saved = savedPrefMap.get(col.field);
      return {
        field: col.field,
        visible: saved?.visible ?? true,
        order: saved?.order ?? index
      };
    });
  }
}
