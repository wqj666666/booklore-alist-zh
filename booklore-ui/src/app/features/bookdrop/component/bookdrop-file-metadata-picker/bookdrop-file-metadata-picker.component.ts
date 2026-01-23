import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Button} from 'primeng/button';
import {NgClass} from '@angular/common';
import {Tooltip} from 'primeng/tooltip';
import {InputText} from 'primeng/inputtext';
import {BookMetadata} from '../../../book/model/book.model';
import {UrlHelperService} from '../../../../shared/service/url-helper.service';
import {Textarea} from 'primeng/textarea';
import {AutoComplete} from 'primeng/autocomplete';
import {Image} from 'primeng/image';
import {LazyLoadImageModule} from 'ng-lazyload-image';
import {ConfirmationService} from 'primeng/api';
import {DatePicker} from 'primeng/datepicker';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-bookdrop-file-metadata-picker-component',
  imports: [
    ReactiveFormsModule,
    Button,
    Tooltip,
    InputText,
    NgClass,
    FormsModule,
    Textarea,
    AutoComplete,
    Image,
    LazyLoadImageModule,
    DatePicker,
    TranslateModule,
  ],
  templateUrl: './bookdrop-file-metadata-picker.component.html',
  styleUrl: './bookdrop-file-metadata-picker.component.scss'
})
export class BookdropFileMetadataPickerComponent {

  private readonly confirmationService = inject(ConfirmationService);
  private readonly translateService = inject(TranslateService);

  @Input() fetchedMetadata!: BookMetadata;
  @Input() originalMetadata?: BookMetadata;
  @Input() metadataForm!: FormGroup;
  @Input() copiedFields: Record<string, boolean> = {};
  @Input() savedFields: Record<string, boolean> = {};
  @Input() bookdropFileId!: number;

  @Output() metadataCopied = new EventEmitter<boolean>();


  metadataFieldsTop = [
    {label: 'bookdrop.metadataPicker.field.title', controlName: 'title', fetchedKey: 'title'},
    {label: 'bookdrop.metadataPicker.field.subtitle', controlName: 'subtitle', fetchedKey: 'subtitle'},
    {label: 'bookdrop.metadataPicker.field.publisher', controlName: 'publisher', fetchedKey: 'publisher'},
  ];

  metadataPublishDate = [
    {label: 'bookdrop.metadataPicker.field.publishedDate', controlName: 'publishedDate', fetchedKey: 'publishedDate'}
  ];

  metadataChips = [
    {label: 'bookdrop.metadataPicker.field.authors', controlName: 'authors', lockedKey: 'authorsLocked', fetchedKey: 'authors'},
    {label: 'bookdrop.metadataPicker.field.genres', controlName: 'categories', lockedKey: 'categoriesLocked', fetchedKey: 'categories'},
    {label: 'bookdrop.metadataPicker.field.moods', controlName: 'moods', lockedKey: 'moodsLocked', fetchedKey: 'moods'},
    {label: 'bookdrop.metadataPicker.field.tags', controlName: 'tags', lockedKey: 'tagsLocked', fetchedKey: 'tags'},
  ];

  metadataDescription = [
    {label: 'bookdrop.metadataPicker.field.description', controlName: 'description', lockedKey: 'descriptionLocked', fetchedKey: 'description'},
  ];

  metadataFieldsBottom = [
    {label: 'bookdrop.metadataPicker.field.seriesName', controlName: 'seriesName', lockedKey: 'seriesNameLocked', fetchedKey: 'seriesName'},
    {label: 'bookdrop.metadataPicker.field.seriesNumber', controlName: 'seriesNumber', lockedKey: 'seriesNumberLocked', fetchedKey: 'seriesNumber'},
    {label: 'bookdrop.metadataPicker.field.seriesTotal', controlName: 'seriesTotal', lockedKey: 'seriesTotalLocked', fetchedKey: 'seriesTotal'},
    {label: 'bookdrop.metadataPicker.field.language', controlName: 'language', lockedKey: 'languageLocked', fetchedKey: 'language'},
    {label: 'bookdrop.metadataPicker.field.isbn10', controlName: 'isbn10', lockedKey: 'isbn10Locked', fetchedKey: 'isbn10'},
    {label: 'bookdrop.metadataPicker.field.isbn13', controlName: 'isbn13', lockedKey: 'isbn13Locked', fetchedKey: 'isbn13'},
    {label: 'bookdrop.metadataPicker.field.asin', controlName: 'asin', lockedKey: 'asinLocked', fetchedKey: 'asin'},
    {label: 'bookdrop.metadataPicker.field.amazonReviewCount', controlName: 'amazonReviewCount', lockedKey: 'amazonReviewCountLocked', fetchedKey: 'amazonReviewCount'},
    {label: 'bookdrop.metadataPicker.field.amazonRating', controlName: 'amazonRating', lockedKey: 'amazonRatingLocked', fetchedKey: 'amazonRating'},
    {label: 'bookdrop.metadataPicker.field.goodreadsId', controlName: 'goodreadsId', lockedKey: 'goodreadsIdLocked', fetchedKey: 'goodreadsId'},
    {label: 'bookdrop.metadataPicker.field.goodreadsReviewCount', controlName: 'goodreadsReviewCount', lockedKey: 'goodreadsReviewCountLocked', fetchedKey: 'goodreadsReviewCount'},
    {label: 'bookdrop.metadataPicker.field.goodreadsRating', controlName: 'goodreadsRating', lockedKey: 'goodreadsRatingLocked', fetchedKey: 'goodreadsRating'},
    {label: 'bookdrop.metadataPicker.field.hardcoverId', controlName: 'hardcoverId', lockedKey: 'hardcoverIdLocked', fetchedKey: 'hardcoverId'},
    {label: 'bookdrop.metadataPicker.field.hardcoverBookId', controlName: 'hardcoverBookId', lockedKey: 'hardcoverBookIdLocked', fetchedKey: 'hardcoverBookId'},
    {label: 'bookdrop.metadataPicker.field.hardcoverReviewCount', controlName: 'hardcoverReviewCount', lockedKey: 'hardcoverReviewCountLocked', fetchedKey: 'hardcoverReviewCount'},
    {label: 'bookdrop.metadataPicker.field.hardcoverRating', controlName: 'hardcoverRating', lockedKey: 'hardcoverRatingLocked', fetchedKey: 'hardcoverRating'},
    {label: 'bookdrop.metadataPicker.field.googleId', controlName: 'googleId', lockedKey: 'googleIdLocked', fetchedKey: 'googleId'},
    {label: 'bookdrop.metadataPicker.field.comicvineId', controlName: 'comicvineId', lockedKey: 'comicvineIdLocked', fetchedKey: 'comicvineId'},
    {label: 'bookdrop.metadataPicker.field.ranobedbId', controlName: 'ranobedbId', lockedKey: 'ranobedbIdLocked', fetchedKey: 'ranobedbId'},
    {label: 'bookdrop.metadataPicker.field.ranobedbRating', controlName: 'ranobedbRating', lockedKey: 'ranobedbRatingLocked', fetchedKey: 'ranobedbRating'},
    {label: 'bookdrop.metadataPicker.field.pageCount', controlName: 'pageCount', lockedKey: 'pageCountLocked', fetchedKey: 'pageCount'}
  ];

  protected urlHelper = inject(UrlHelperService);

  copyMissing(): void {
    Object.keys(this.fetchedMetadata).forEach((field) => {
      const isLocked = this.metadataForm.get(`${field}Locked`)?.value;
      const currentValue = this.metadataForm.get(field)?.value;
      const fetchedValue = this.fetchedMetadata[field];

      const isEmpty = Array.isArray(currentValue)
        ? currentValue.length === 0
        : !currentValue;

      if (!isLocked && isEmpty && fetchedValue) {
        this.copyFetchedToCurrent(field);
      }
    });
  }

  copyAll(includeCover: boolean = true): void {
    if (this.fetchedMetadata) {
      Object.keys(this.fetchedMetadata).forEach((field) => {
        if (this.fetchedMetadata[field] && (includeCover || field !== 'thumbnailUrl')) {
          this.copyFetchedToCurrent(field);
        }
      });
    }
  }

  copyFetchedToCurrent(field: string): void {
    const value = this.fetchedMetadata[field];
    if (value) {
      this.metadataForm.get(field)?.setValue(value);
      this.copiedFields[field] = true;
      this.metadataCopied.emit(true);
    }
  }

  isValueChanged(field: string): boolean {
    const [value, original] = this.prepFieldComparison(this.metadataForm.get(field)?.value, this.originalMetadata?.[field]);
    return (value && value != original) || (!value && original);
  }

  isFetchedDifferent(field: string): boolean {
    const [value, fetched] = this.prepFieldComparison(this.metadataForm.get(field)?.value, this.fetchedMetadata[field]);
    return (fetched && fetched != value);
  }

  private prepFieldComparison(field1: any, field2: any) {
    if (Array.isArray(field1)) {
      field1 = field1.length > 0 ? JSON.stringify(field1.sort()) : undefined;
    }
    if (Array.isArray(field2)) {
      field2 = field2.length > 0 ? JSON.stringify(field2.sort()) : undefined;
    }
    return [field1, field2];
  }

  isValueCopied(field: string): boolean {
    return this.copiedFields[field];
  }

  isValueSaved(field: string): boolean {
    return this.savedFields[field];
  }

  resetField(field: string) {
    this.metadataForm.get(field)?.setValue(this.originalMetadata?.[field]);
    this.copiedFields[field] = false;
    if (field === 'thumbnailUrl') {
      this.metadataForm.get('thumbnailUrl')?.setValue(this.urlHelper.getBookdropCoverUrl(this.bookdropFileId));
    }
  }

  onAutoCompleteBlur(fieldName: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const inputValue = target?.value?.trim();
    if (inputValue) {
      const currentValue = this.metadataForm.get(fieldName)?.value || [];
      const values = Array.isArray(currentValue) ? currentValue :
        typeof currentValue === 'string' && currentValue ? currentValue.split(',').map((v: string) => v.trim()) : []
      if (!values.includes(inputValue)) {
        values.push(inputValue);
        this.metadataForm.get(fieldName)?.setValue(values);
      }
      if (target) {
        target.value = '';
      }
    }
  }

  confirmReset(): void {
    this.confirmationService.confirm({
      message: this.translateService.instant('bookdrop.metadataPicker.confirmReset.message'),
      header: this.translateService.instant('bookdrop.metadataPicker.confirmReset.header'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.resetAll()
    });
  }

  resetAll() {
    if (this.originalMetadata) {
      this.metadataForm.patchValue({
        title: this.originalMetadata.title || null,
        subtitle: this.originalMetadata.subtitle || null,
        authors: [...(this.originalMetadata.authors ?? [])].sort(),
        categories: [...(this.originalMetadata.categories ?? [])].sort(),
        moods: [...(this.originalMetadata.moods ?? [])].sort(),
        tags: [...(this.originalMetadata.tags ?? [])].sort(),
        publisher: this.originalMetadata.publisher || null,
        publishedDate: this.originalMetadata.publishedDate || null,
        isbn10: this.originalMetadata.isbn10 || null,
        isbn13: this.originalMetadata.isbn13 || null,
        description: this.originalMetadata.description || null,
        pageCount: this.originalMetadata.pageCount || null,
        language: this.originalMetadata.language || null,
        asin: this.originalMetadata.asin || null,
        amazonRating: this.originalMetadata.amazonRating || null,
        amazonReviewCount: this.originalMetadata.amazonReviewCount || null,
        goodreadsId: this.originalMetadata.goodreadsId || null,
        goodreadsRating: this.originalMetadata.goodreadsRating || null,
        goodreadsReviewCount: this.originalMetadata.goodreadsReviewCount || null,
        hardcoverId: this.originalMetadata.hardcoverId || null,
        hardcoverBookId: this.originalMetadata.hardcoverBookId || null,
        hardcoverRating: this.originalMetadata.hardcoverRating || null,
        hardcoverReviewCount: this.originalMetadata.hardcoverReviewCount || null,
        googleId: this.originalMetadata.googleId || null,
        comicvineId: this.originalMetadata.comicvineId || null,
        ranobedbId: this.originalMetadata.ranobedbId || null,
        ranobedbRating: this.originalMetadata.ranobedbRating || null,
        seriesName: this.originalMetadata.seriesName || null,
        seriesNumber: this.originalMetadata.seriesNumber || null,
        seriesTotal: this.originalMetadata.seriesTotal || null,
        thumbnailUrl: this.urlHelper.getBookdropCoverUrl(this.bookdropFileId),
      });
    }
    this.copiedFields = {};
    this.metadataCopied.emit(false);
  }
}
