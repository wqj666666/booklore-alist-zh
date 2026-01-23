import {Component, ElementRef, inject, OnInit, ViewChild} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';
import {Button} from 'primeng/button';
import {InputText} from 'primeng/inputtext';
import {Divider} from 'primeng/divider';
import {Chip} from 'primeng/chip';
import {ProgressSpinner} from 'primeng/progressspinner';
import {BookdropService, PatternExtractResult} from '../../service/bookdrop.service';
import {MessageService} from 'primeng/api';
import {NgClass} from '@angular/common';
import {Tooltip} from 'primeng/tooltip';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

interface PatternPlaceholder {
  name: string;
  descriptionKey: string;
  example: string;
}

interface PreviewResult {
  fileName: string;
  success: boolean;
  preview: Record<string, string>;
  errorMessage?: string;
}

@Component({
  selector: 'app-bookdrop-pattern-extract-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Button,
    InputText,
    Divider,
    Chip,
    ProgressSpinner,
    NgClass,
    Tooltip,
    TranslateModule,
  ],
  templateUrl: './bookdrop-pattern-extract-dialog.component.html',
  styleUrl: './bookdrop-pattern-extract-dialog.component.scss'
})
export class BookdropPatternExtractDialogComponent implements OnInit {

  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly bookdropService = inject(BookdropService);
  private readonly messageService = inject(MessageService);
  private readonly translateService = inject(TranslateService);

  @ViewChild('patternInput', {static: false}) patternInput?: ElementRef<HTMLInputElement>;

  fileCount = 0;
  selectAll = false;
  excludedIds: number[] = [];
  selectedIds: number[] = [];

  isExtracting = false;
  previewResults: PreviewResult[] = [];

  spinnerStyle = {width: '24px', height: '24px'};

  patternForm = new FormGroup({
    pattern: new FormControl('', Validators.required),
  });

  availablePlaceholders: PatternPlaceholder[] = [
    {name: '*', descriptionKey: 'bookdrop.patternExtract.placeholder.wildcard.description', example: 'anything'},
    {name: 'SeriesName', descriptionKey: 'bookdrop.patternExtract.placeholder.seriesName.description', example: 'Chronicles of Earth'},
    {name: 'Title', descriptionKey: 'bookdrop.patternExtract.placeholder.title.description', example: 'The Lost City'},
    {name: 'Subtitle', descriptionKey: 'bookdrop.patternExtract.placeholder.subtitle.description', example: 'A Tale of Adventure'},
    {name: 'Authors', descriptionKey: 'bookdrop.patternExtract.placeholder.authors.description', example: 'John Smith'},
    {name: 'SeriesNumber', descriptionKey: 'bookdrop.patternExtract.placeholder.seriesNumber.description', example: '25'},
    {name: 'Published', descriptionKey: 'bookdrop.patternExtract.placeholder.published.description', example: '{Published:yyyy-MM-dd}'},
    {name: 'Publisher', descriptionKey: 'bookdrop.patternExtract.placeholder.publisher.description', example: 'Epic Press'},
    {name: 'Language', descriptionKey: 'bookdrop.patternExtract.placeholder.language.description', example: 'en'},
    {name: 'SeriesTotal', descriptionKey: 'bookdrop.patternExtract.placeholder.seriesTotal.description', example: '50'},
    {name: 'ISBN10', descriptionKey: 'bookdrop.patternExtract.placeholder.isbn10.description', example: '1234567890'},
    {name: 'ISBN13', descriptionKey: 'bookdrop.patternExtract.placeholder.isbn13.description', example: '1234567890123'},
    {name: 'ASIN', descriptionKey: 'bookdrop.patternExtract.placeholder.asin.description', example: 'B012345678'},
  ];

  commonPatterns = [
    {labelKey: 'bookdrop.patternExtract.commonPatterns.authorTitle', pattern: '{Authors} - {Title}'},
    {labelKey: 'bookdrop.patternExtract.commonPatterns.titleAuthor', pattern: '{Title} - {Authors}'},
    {labelKey: 'bookdrop.patternExtract.commonPatterns.titleYear', pattern: '{Title} ({Published:yyyy})'},
    {labelKey: 'bookdrop.patternExtract.commonPatterns.authorTitleYear', pattern: '{Authors} - {Title} ({Published:yyyy})'},
    {labelKey: 'bookdrop.patternExtract.commonPatterns.seriesNumber', pattern: '{SeriesName} #{SeriesNumber}'},
    {labelKey: 'bookdrop.patternExtract.commonPatterns.seriesChapterNumber', pattern: '{SeriesName} - Chapter {SeriesNumber}'},
    {labelKey: 'bookdrop.patternExtract.commonPatterns.seriesVolNumber', pattern: '{SeriesName} - Vol {SeriesNumber}'},
    {labelKey: 'bookdrop.patternExtract.commonPatterns.tagSeriesChapterNumber', pattern: '[*] {SeriesName} - Chapter {SeriesNumber}'},
    {labelKey: 'bookdrop.patternExtract.commonPatterns.titleByAuthor', pattern: '{Title} by {Authors}'},
    {labelKey: 'bookdrop.patternExtract.commonPatterns.seriesVolumeOfTotal', pattern: '{SeriesName} v{SeriesNumber} (of {SeriesTotal})'},
  ];

  ngOnInit(): void {
    this.fileCount = this.config.data?.fileCount ?? 0;
    this.selectAll = this.config.data?.selectAll ?? false;
    this.excludedIds = this.config.data?.excludedIds ?? [];
    this.selectedIds = this.config.data?.selectedIds ?? [];
  }

  insertPlaceholder(placeholderName: string): void {
    const patternControl = this.patternForm.get('pattern');
    const currentPattern = patternControl?.value ?? '';
    const inputElement = this.patternInput?.nativeElement;
    
    const textToInsert = placeholderName === '*' ? '*' : `{${placeholderName}}`;
    
    const patternToModify = placeholderName === '*' 
      ? currentPattern 
      : this.removeExistingPlaceholder(currentPattern, placeholderName);
    
    if (inputElement) {
      const cursorPosition = this.calculateCursorPosition(inputElement, currentPattern, patternToModify);
      const newPattern = this.insertTextAtCursor(patternToModify, textToInsert, cursorPosition);
      
      patternControl?.setValue(newPattern);
      this.focusInputAfterInsertion(inputElement, cursorPosition, textToInsert.length);
    } else {
      patternControl?.setValue(patternToModify + textToInsert);
    }
    
    this.previewPattern();
  }

  private removeExistingPlaceholder(pattern: string, placeholderName: string): string {
    const existingPlaceholderRegex = new RegExp(`\\{${placeholderName}(?::[^}]*)?\\}`, 'g');
    return pattern.replace(existingPlaceholderRegex, '');
  }

  private calculateCursorPosition(inputElement: HTMLInputElement, originalPattern: string, modifiedPattern: string): number {
    let cursorPosition = inputElement.selectionStart ?? modifiedPattern.length;
    
    if (originalPattern !== modifiedPattern) {
      const existingPlaceholderRegex = new RegExp(`\\{\\w+(?::[^}]*)?\\}`, 'g');
      const matchBefore = originalPattern.substring(0, cursorPosition).match(existingPlaceholderRegex);
      if (matchBefore) {
        cursorPosition -= matchBefore.reduce((sum, match) => sum + match.length, 0);
      }
      cursorPosition = Math.max(0, cursorPosition);
    }
    
    return cursorPosition;
  }

  private insertTextAtCursor(pattern: string, text: string, cursorPosition: number): string {
    const textBefore = pattern.substring(0, cursorPosition);
    const textAfter = pattern.substring(cursorPosition);
    return textBefore + text + textAfter;
  }

  private focusInputAfterInsertion(inputElement: HTMLInputElement, cursorPosition: number, insertedTextLength: number): void {
    setTimeout(() => {
      const newCursorPosition = cursorPosition + insertedTextLength;
      inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
      inputElement.focus();
    }, 0);
  }

  applyCommonPattern(pattern: string): void {
    this.patternForm.get('pattern')?.setValue(pattern);
    this.previewPattern();
  }

  previewPattern(): void {
    const pattern = this.patternForm.get('pattern')?.value;
    if (!pattern) {
      this.previewResults = [];
      return;
    }

    const request = {
      pattern,
      selectAll: this.selectAll,
      excludedIds: this.excludedIds,
      selectedIds: this.selectedIds,
      preview: true
    };

    this.bookdropService.extractFromPattern(request).subscribe({
      next: (result) => {
        this.previewResults = result.results.map(r => ({
          fileName: r.fileName,
          success: r.success,
          preview: r.extractedMetadata || {},
          errorMessage: r.errorMessage
        }));
      },
      error: () => {
        this.previewResults = [];
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  extract(): void {
    const pattern = this.patternForm.get('pattern')?.value;
    if (!pattern) {
      return;
    }

    this.isExtracting = true;

    const payload = {
      pattern,
      selectAll: this.selectAll,
      excludedIds: this.excludedIds,
      selectedIds: this.selectedIds,
      preview: false,
    };

    this.bookdropService.extractFromPattern(payload).subscribe({
      next: (result: PatternExtractResult) => {
        this.isExtracting = false;
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('bookdrop.patternExtract.toast.success.summary'),
          detail: this.translateService.instant('bookdrop.patternExtract.toast.success.detail', {
            successfullyExtracted: result.successfullyExtracted,
            totalFiles: result.totalFiles
          }),
        });
        this.dialogRef.close(result);
      },
      error: (err) => {
        this.isExtracting = false;
        console.error('Pattern extraction failed:', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('bookdrop.patternExtract.toast.failure.summary'),
          detail: this.translateService.instant('bookdrop.patternExtract.toast.failure.detail'),
        });
      },
    });
  }

  get hasValidPattern(): boolean {
    const pattern: string = this.patternForm.get('pattern')?.value ?? '';
    if (!this.patternForm.valid || !pattern) {
      return false;
    }
    const placeholderRegex = /\{[a-zA-Z0-9_]+(?::[^{}]+)?\}|\*/;
    return placeholderRegex.test(pattern);
  }

  get patternControl(): FormControl {
    return this.patternForm.get('pattern') as FormControl;
  }

  getPlaceholderLabel(name: string): string {
    return name === '*' ? '*' : `{${name}}`;
  }

  getPlaceholderTooltip(placeholder: PatternPlaceholder): string {
    const description = this.translateService.instant(placeholder.descriptionKey);
    const example = this.translateService.instant('bookdrop.patternExtract.placeholder.example', {
      example: placeholder.example
    });
    return `${description} ${example}`;
  }

  getPreviewClass(preview: PreviewResult): Record<string, boolean> {
    return {
      'preview-success': preview.success,
      'preview-failure': !preview.success
    };
  }

  getPreviewIconClass(preview: PreviewResult): string {
    return preview.success ? 'pi-check-circle' : 'pi-times-circle';
  }

  getPreviewEntries(preview: PreviewResult): {key: string; value: string}[] {
    return Object.entries(preview.preview).map(([key, value]) => ({key, value}));
  }

  getErrorMessage(preview: PreviewResult): string {
    return preview.errorMessage || this.translateService.instant('bookdrop.patternExtract.preview.error.defaultMessage');
  }

  getErrorTooltip(preview: PreviewResult): string {
    return preview.success
      ? ''
      : (preview.errorMessage || this.translateService.instant('bookdrop.patternExtract.preview.error.defaultTooltip'));
  }
}
