import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {EnvironmentInjector, runInInjectionContext} from '@angular/core';
import {MessageService} from 'primeng/api';
import {TableColumnPreferenceService} from './table-column-preference.service';
import {TableColumnPreference, UserService} from '../../../settings/user-management/user.service';
import {TranslateService} from '@ngx-translate/core';

describe('TableColumnPreferenceService', () => {
  let service: TableColumnPreferenceService;
  let userServiceMock: any;
  let messageServiceMock: any;
  let translateServiceMock: any;

  const allColumns = [
    {field: 'readStatus', header: 'Read'},
    {field: 'title', header: 'Title'},
    {field: 'authors', header: 'Authors'},
    {field: 'publisher', header: 'Publisher'},
    {field: 'seriesName', header: 'Series'},
    {field: 'seriesNumber', header: 'Series #'},
    {field: 'categories', header: 'Genres'},
    {field: 'publishedDate', header: 'Published'},
    {field: 'lastReadTime', header: 'Last Read'},
    {field: 'addedOn', header: 'Added'},
    {field: 'fileSizeKb', header: 'File Size'},
    {field: 'language', header: 'Language'},
    {field: 'isbn', header: 'ISBN'},
    {field: 'pageCount', header: 'Pages'},
    {field: 'amazonRating', header: 'Amazon'},
    {field: 'amazonReviewCount', header: 'AZ #'},
    {field: 'goodreadsRating', header: 'Goodreads'},
    {field: 'goodreadsReviewCount', header: 'GR #'},
    {field: 'hardcoverRating', header: 'Hardcover'},
    {field: 'hardcoverReviewCount', header: 'HC #'},
    {field: 'ranobedbRating', header: 'Ranobedb'},
  ];

  const fallbackPreferences: TableColumnPreference[] = allColumns.map((col, index) => ({
    field: col.field,
    visible: true,
    order: index
  }));

  beforeEach(() => {
    userServiceMock = {
      getCurrentUser: vi.fn(),
      updateUserSetting: vi.fn()
    };
    messageServiceMock = {
      add: vi.fn()
    };
    translateServiceMock = {
      instant: vi.fn((key: string) => {
        const dictionary: Record<string, string> = {
          'book.table.column.readStatus': 'Read',
          'book.table.column.title': 'Title',
          'book.table.column.authors': 'Authors',
          'book.table.column.publisher': 'Publisher',
          'book.table.column.seriesName': 'Series',
          'book.table.column.seriesNumber': 'Series #',
          'book.table.column.categories': 'Genres',
          'book.table.column.publishedDate': 'Published',
          'book.table.column.lastReadTime': 'Last Read',
          'book.table.column.addedOn': 'Added',
          'book.table.column.fileSizeKb': 'File Size',
          'book.table.column.language': 'Language',
          'book.table.column.isbn': 'ISBN',
          'book.table.column.pageCount': 'Pages',
          'book.table.column.amazonRating': 'Amazon',
          'book.table.column.amazonReviewCount': 'AZ #',
          'book.table.column.goodreadsRating': 'Goodreads',
          'book.table.column.goodreadsReviewCount': 'GR #',
          'book.table.column.hardcoverRating': 'Hardcover',
          'book.table.column.hardcoverReviewCount': 'HC #',
          'book.table.column.ranobedbRating': 'Ranobedb',
          'book.browser.columns.toast.preferencesSaved.summary': 'Preferences Saved',
          'book.browser.columns.toast.preferencesSaved.detail': 'Preferences have been saved.',
        };
        return dictionary[key] ?? key;
      })
    };

    TestBed.configureTestingModule({
      providers: [
        TableColumnPreferenceService,
        {provide: UserService, useValue: userServiceMock},
        {provide: MessageService, useValue: messageServiceMock},
        {provide: TranslateService, useValue: translateServiceMock}
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);
    service = runInInjectionContext(injector, () => TestBed.inject(TableColumnPreferenceService));
  });

  it('should initialize with fallback preferences if none provided', () => {
    service.initPreferences(undefined);
    expect(service.preferences).toEqual(fallbackPreferences);
  });

  it('should initialize with provided preferences', () => {
    const savedPrefs: TableColumnPreference[] = [
      {field: 'title', visible: true, order: 0},
      {field: 'authors', visible: false, order: 1}
    ];
    service.initPreferences(savedPrefs);
    expect(service.preferences.find(p => p.field === 'title')?.visible).toBe(true);
    expect(service.preferences.find(p => p.field === 'authors')?.visible).toBe(false);
    expect(service.preferences.length).toBe(allColumns.length);
  });

  it('should return all columns', () => {
    expect(service.allColumns).toEqual(allColumns);
  });

  it('should return visible columns sorted by order', () => {
    const prefs: TableColumnPreference[] = [
      {field: 'title', visible: true, order: 1},
      {field: 'authors', visible: true, order: 0},
      {field: 'publisher', visible: false, order: 2}
    ];
    service['preferencesSubject'].next([
      ...prefs,
      ...fallbackPreferences.filter(p => !prefs.some(fp => fp.field === p.field))
    ]);
    const visible = service.visibleColumns;
    const fields = visible.map(col => col.field);
    expect(fields.indexOf('authors')).toBeLessThan(fields.indexOf('title'));
    expect(fields).not.toContain('publisher');
  });

  it('should save visible columns and update preferences', () => {
    const selectedColumns = [
      {field: 'title'},
      {field: 'authors'}
    ];
    userServiceMock.getCurrentUser.mockReturnValue({id: 42});
    service.saveVisibleColumns(selectedColumns);
    const prefs = service.preferences;
    expect(prefs.find(p => p.field === 'title')?.visible).toBe(true);
    expect(prefs.find(p => p.field === 'authors')?.visible).toBe(true);
    expect(prefs.find(p => p.field === 'publisher')?.visible).toBe(false);
    expect(userServiceMock.updateUserSetting).toHaveBeenCalledWith(42, 'tableColumnPreference', prefs);
    expect(messageServiceMock.add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'success',
      summary: 'Preferences Saved'
    }));
  });

  it('should not call updateUserSetting if no current user', () => {
    userServiceMock.getCurrentUser.mockReturnValue(undefined);
    service.saveVisibleColumns([{field: 'title'}]);
    expect(userServiceMock.updateUserSetting).not.toHaveBeenCalled();
    expect(messageServiceMock.add).not.toHaveBeenCalled();
  });

  it('should get column header for known and unknown fields', () => {
    expect(service['getColumnHeader']('title')).toBe('Title');
    expect(service['getColumnHeader']('unknown')).toBe('unknown');
  });

  it('should merge saved preferences with all columns', () => {
    const savedPrefs: TableColumnPreference[] = [
      {field: 'title', visible: false, order: 5}
    ];
    const merged = service['mergeWithAllColumns'](savedPrefs);
    expect(merged.find(p => p.field === 'title')?.visible).toBe(false);
    expect(merged.length).toBe(allColumns.length);
    expect(merged.find(p => p.field === 'authors')?.visible).toBe(true);
  });
});

