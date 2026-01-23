import {Component, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges} from '@angular/core';
import {Select} from 'primeng/select';
import {FormsModule} from '@angular/forms';

import {Checkbox} from 'primeng/checkbox';
import {Button} from 'primeng/button';
import {MessageService} from 'primeng/api';
import {FieldOptions, MetadataRefreshOptions} from '../../../model/request/metadata-refresh-options.model';
import {Tooltip} from 'primeng/tooltip';
import {TranslateModule} from '@ngx-translate/core';
import {TranslateService} from '@ngx-translate/core';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-metadata-advanced-fetch-options',
  templateUrl: './metadata-advanced-fetch-options.component.html',
  imports: [Select, FormsModule, Checkbox, Button, Tooltip, TranslateModule],
  styleUrl: './metadata-advanced-fetch-options.component.scss',
  standalone: true
})
export class MetadataAdvancedFetchOptionsComponent implements OnChanges, OnInit, OnDestroy {

  @Output() metadataOptionsSubmitted = new EventEmitter<MetadataRefreshOptions>();
  @Input() currentMetadataOptions!: MetadataRefreshOptions;
  @Input() submitButtonLabel!: string;
  @Input() submitButtonLabelParams?: Record<string, unknown>;

  fields: (keyof FieldOptions)[] = [
    'title', 'subtitle', 'description', 'authors', 'publisher', 'publishedDate',
    'seriesName', 'seriesNumber', 'seriesTotal', 'isbn13', 'isbn10',
    'language', 'categories', 'cover', 'pageCount',
    'asin', 'goodreadsId', 'comicvineId', 'hardcoverId', 'googleId', 'lubimyczytacId', 'ranobedbId',
    'amazonRating', 'amazonReviewCount', 'goodreadsRating', 'goodreadsReviewCount',
    'hardcoverRating', 'hardcoverReviewCount', 'lubimyczytacRating', 'ranobedbRating',
    'moods', 'tags'
  ];

  providerSpecificFields: (keyof FieldOptions)[] = [
    'asin', 'goodreadsId', 'comicvineId', 'hardcoverId', 'googleId', 'lubimyczytacId', 'ranobedbId',
    'amazonRating', 'amazonReviewCount', 'goodreadsRating', 'goodreadsReviewCount',
    'hardcoverRating', 'hardcoverReviewCount', 'lubimyczytacRating', 'ranobedbRating',
    'moods', 'tags'
  ];

  nonProviderSpecificFields: (keyof FieldOptions)[] = [
    'title', 'subtitle', 'description', 'authors', 'publisher', 'publishedDate',
    'seriesName', 'seriesNumber', 'seriesTotal', 'isbn13', 'isbn10',
    'language', 'categories', 'cover', 'pageCount',
  ];

  providers: string[] = ['Amazon', 'Google', 'GoodReads', 'Hardcover', 'Comicvine', 'Douban', 'Lubimyczytac', 'Ranobedb'];
  providersWithClear: string[] = [];

  refreshCovers: boolean = false;
  mergeCategories: boolean = false;
  reviewBeforeApply: boolean = false;

  fieldOptions: FieldOptions = this.initializeFieldOptions();
  enabledFields: Record<keyof FieldOptions, boolean> = this.initializeEnabledFields();

  bulkP1: string | null = null;
  bulkP2: string | null = null;
  bulkP3: string | null = null;
  bulkP4: string | null = null;

  private messageService = inject(MessageService);
  private translateService = inject(TranslateService);
  private langChangeSubscription?: Subscription;

  private justSubmitted = false;

  private providerSpecificFieldsList = [
    'asin', 'goodreadsId','comicvineId', 'hardcoverId', 'googleId', 'lubimyczytacId', 'ranobedbId',
    'amazonRating', 'amazonReviewCount', 'goodreadsRating', 'goodreadsReviewCount',
    'hardcoverRating', 'hardcoverReviewCount', 'lubimyczytacRating', 'ranobedbRating',
    'moods', 'tags'
  ];

  ngOnInit(): void {
    this.rebuildProvidersWithClear();
    this.langChangeSubscription = this.translateService.onLangChange.subscribe(() => this.rebuildProvidersWithClear());
  }

  ngOnDestroy(): void {
    this.langChangeSubscription?.unsubscribe();
  }

  private initializeFieldOptions(): FieldOptions {
    return this.fields.reduce((acc, field) => {
      acc[field] = {p1: null, p2: null, p3: null, p4: null};
      return acc;
    }, {} as FieldOptions);
  }

  private initializeEnabledFields(): Record<keyof FieldOptions, boolean> {
    return this.fields.reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {} as Record<keyof FieldOptions, boolean>);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentMetadataOptions'] && this.currentMetadataOptions && !this.justSubmitted) {
      this.refreshCovers = this.currentMetadataOptions.refreshCovers || false;
      this.mergeCategories = this.currentMetadataOptions.mergeCategories || false;
      this.reviewBeforeApply = this.currentMetadataOptions.reviewBeforeApply || false;

      const backendFieldOptions = this.deepCloneFieldOptions(this.currentMetadataOptions.fieldOptions as FieldOptions || {});
      for (const field of this.fields) {
        if (!backendFieldOptions[field]) {
          backendFieldOptions[field] = {p1: null, p2: null, p3: null, p4: null};
        } else {
          backendFieldOptions[field].p4 ??= null;
        }
      }
      this.fieldOptions = backendFieldOptions;

      if (this.currentMetadataOptions.enabledFields) {
        this.enabledFields = {...this.enabledFields, ...this.currentMetadataOptions.enabledFields};
      } else {
        this.enabledFields = this.initializeEnabledFields();
      }
    }
  }

  private deepCloneFieldOptions(fieldOptions: FieldOptions): FieldOptions {
    const cloned = {} as FieldOptions;
    for (const field of this.fields) {
      cloned[field] = {
        p1: fieldOptions[field]?.p1 || null,
        p2: fieldOptions[field]?.p2 || null,
        p3: fieldOptions[field]?.p3 || null,
        p4: fieldOptions[field]?.p4 || null
      };
    }
    return cloned;
  }

  submit() {
    const allFieldsHaveProvider = Object.entries(this.fieldOptions).every(([field, opt]) =>
      !this.enabledFields[field as keyof FieldOptions] ||
      this.isProviderSpecificField(field as keyof FieldOptions) ||
      opt.p1 !== null || opt.p2 !== null || opt.p3 !== null || opt.p4 !== null
    );

    if (allFieldsHaveProvider) {
      this.justSubmitted = true;

      const metadataRefreshOptions: MetadataRefreshOptions = {
        libraryId: null,
        refreshCovers: this.refreshCovers,
        mergeCategories: this.mergeCategories,
        reviewBeforeApply: this.reviewBeforeApply,
        fieldOptions: this.fieldOptions,
        enabledFields: this.enabledFields
      };

      this.metadataOptionsSubmitted.emit(metadataRefreshOptions);

      setTimeout(() => {
        this.justSubmitted = false;
      }, 1000);
    } else {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('metadata.advancedFetch.error.validationSummary'),
        detail: this.translateService.instant('metadata.advancedFetch.error.validationDetail'),
        life: 5000
      });
    }
  }

  setBulkProvider(priority: 'p1' | 'p2' | 'p3' | 'p4', provider: string | null): void {
    if (!provider) return;

    const value = provider === this.getClearAllLabel() ? null : provider;

    for (const field of this.nonProviderSpecificFields) {
      if (this.enabledFields[field]) {
        this.fieldOptions[field][priority] = value;
      }
    }

    switch (priority) {
      case 'p1':
        this.bulkP1 = null;
        break;
      case 'p2':
        this.bulkP2 = null;
        break;
      case 'p3':
        this.bulkP3 = null;
        break;
      case 'p4':
        this.bulkP4 = null;
        break;
    }
  }

  private rebuildProvidersWithClear(): void {
    this.providersWithClear = [this.getClearAllLabel(), ...this.providers];
  }

  private getClearAllLabel(): string {
    return this.translateService.instant('metadata.advancedFetch.option.clearAll');
  }

  reset() {
    this.justSubmitted = false;
    for (const field of Object.keys(this.fieldOptions)) {
      this.fieldOptions[field as keyof FieldOptions] = {
        p1: null,
        p2: null,
        p3: null,
        p4: null
      };
    }
    this.enabledFields = this.initializeEnabledFields();

    // Reset bulk selectors
    this.bulkP1 = null;
    this.bulkP2 = null;
    this.bulkP3 = null;
    this.bulkP4 = null;
  }

  formatLabel(field: string): string {
    const fieldLabelKeys: Record<string, string> = {
      title: 'metadata.advancedFetch.field.title',
      subtitle: 'metadata.advancedFetch.field.subtitle',
      description: 'metadata.advancedFetch.field.description',
      authors: 'metadata.advancedFetch.field.authors',
      publisher: 'metadata.advancedFetch.field.publisher',
      publishedDate: 'metadata.advancedFetch.field.publishedDate',
      seriesName: 'metadata.advancedFetch.field.seriesName',
      seriesNumber: 'metadata.advancedFetch.field.seriesNumber',
      seriesTotal: 'metadata.advancedFetch.field.seriesTotal',
      isbn13: 'metadata.advancedFetch.field.isbn13',
      isbn10: 'metadata.advancedFetch.field.isbn10',
      language: 'metadata.advancedFetch.field.language',
      categories: 'metadata.advancedFetch.field.categories',
      cover: 'metadata.advancedFetch.field.cover',
      pageCount: 'metadata.advancedFetch.field.pageCount',
      asin: 'metadata.advancedFetch.field.asin',
      goodreadsId: 'metadata.advancedFetch.field.goodreadsId',
      comicvineId: 'metadata.advancedFetch.field.comicvineId',
      hardcoverId: 'metadata.advancedFetch.field.hardcoverId',
      googleId: 'metadata.advancedFetch.field.googleId',
      amazonRating: 'metadata.advancedFetch.field.amazonRating',
      amazonReviewCount: 'metadata.advancedFetch.field.amazonReviewCount',
      goodreadsRating: 'metadata.advancedFetch.field.goodreadsRating',
      goodreadsReviewCount: 'metadata.advancedFetch.field.goodreadsReviewCount',
      hardcoverRating: 'metadata.advancedFetch.field.hardcoverRating',
      hardcoverReviewCount: 'metadata.advancedFetch.field.hardcoverReviewCount',
      lubimyczytacId: 'metadata.advancedFetch.field.lubimyczytacId',
      lubimyczytacRating: 'metadata.advancedFetch.field.lubimyczytacRating',
      ranobedbId: 'metadata.advancedFetch.field.ranobedbId',
      ranobedbRating: 'metadata.advancedFetch.field.ranobedbRating',
      moods: 'metadata.advancedFetch.field.moods',
      tags: 'metadata.advancedFetch.field.tags'
    };

    return fieldLabelKeys[field] ?? `metadata.advancedFetch.field.${field}`;
  }

  isProviderSpecificField(field: keyof FieldOptions): boolean {
    return this.providerSpecificFieldsList.includes(field as string);
  }
}
