import {Component, inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MessageService} from 'primeng/api';
import {MetadataMatchWeightsService} from '../../../../shared/service/metadata-match-weights.service';
import {Button} from 'primeng/button';
import {Tooltip} from 'primeng/tooltip';
import {filter, take} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {AppSettingKey, AppSettings} from '../../../../shared/model/app-settings.model';
import {AppSettingsService} from '../../../../shared/service/app-settings.service';
import {InputNumber} from 'primeng/inputnumber';
import {TranslateModule, TranslateService} from '@ngx-translate/core';


@Component({
  selector: 'app-metadata-match-weights-component',
  imports: [
    ReactiveFormsModule,
    Button,
    Tooltip,
    InputNumber,
    TranslateModule
  ],
  templateUrl: './metadata-match-weights-component.html',
  styleUrl: './metadata-match-weights-component.scss'
})
export class MetadataMatchWeightsComponent implements OnInit {

  readonly labelMap: Record<string, string> = {
    title: 'settings.metadataMatchWeights.field.title',
    subtitle: 'settings.metadataMatchWeights.field.subtitle',
    authors: 'settings.metadataMatchWeights.field.authors',
    description: 'settings.metadataMatchWeights.field.description',
    publisher: 'settings.metadataMatchWeights.field.publisher',
    publishedDate: 'settings.metadataMatchWeights.field.publishedDate',
    categories: 'settings.metadataMatchWeights.field.categories',
    coverImage: 'settings.metadataMatchWeights.field.coverImage',
    seriesName: 'settings.metadataMatchWeights.field.seriesName',
    seriesNumber: 'settings.metadataMatchWeights.field.seriesNumber',
    language: 'settings.metadataMatchWeights.field.language',
    isbn13: 'settings.metadataMatchWeights.field.isbn13',
    isbn10: 'settings.metadataMatchWeights.field.isbn10',
    pageCount: 'settings.metadataMatchWeights.field.pageCount',
    amazonRating: 'settings.metadataMatchWeights.field.amazonRating',
    amazonReviewCount: 'settings.metadataMatchWeights.field.amazonReviewCount',
    goodreadsRating: 'settings.metadataMatchWeights.field.goodreadsRating',
    goodreadsReviewCount: 'settings.metadataMatchWeights.field.goodreadsReviewCount',
    hardcoverRating: 'settings.metadataMatchWeights.field.hardcoverRating',
    hardcoverReviewCount: 'settings.metadataMatchWeights.field.hardcoverReviewCount',
    ranobedbRating: 'settings.metadataMatchWeights.field.ranobedbRating',
  };

  form!: FormGroup;
  isSaving = false;
  isRecalculating = false;

  private weightsService = inject(MetadataMatchWeightsService);
  private appSettingsService = inject(AppSettingsService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);
  private translateService = inject(TranslateService);

  appSettings$: Observable<AppSettings | null> = this.appSettingsService.appSettings$;

  ngOnInit(): void {
    this.form = this.fb.group({
      title: [0, [Validators.required, Validators.min(0)]],
      subtitle: [0, [Validators.required, Validators.min(0)]],
      description: [0, [Validators.required, Validators.min(0)]],
      publisher: [0, [Validators.required, Validators.min(0)]],
      publishedDate: [0, [Validators.required, Validators.min(0)]],
      authors: [0, [Validators.required, Validators.min(0)]],
      categories: [0, [Validators.required, Validators.min(0)]],
      seriesName: [0, [Validators.required, Validators.min(0)]],
      seriesNumber: [0, [Validators.required, Validators.min(0)]],
      isbn13: [0, [Validators.required, Validators.min(0)]],
      isbn10: [0, [Validators.required, Validators.min(0)]],
      pageCount: [0, [Validators.required, Validators.min(0)]],
      language: [0, [Validators.required, Validators.min(0)]],
      amazonRating: [0, [Validators.required, Validators.min(0)]],
      amazonReviewCount: [0, [Validators.required, Validators.min(0)]],
      goodreadsRating: [0, [Validators.required, Validators.min(0)]],
      goodreadsReviewCount: [0, [Validators.required, Validators.min(0)]],
      hardcoverRating: [0, [Validators.required, Validators.min(0)]],
      hardcoverReviewCount: [0, [Validators.required, Validators.min(0)]],
      ranobedbRating: [0, [Validators.required, Validators.min(0)]],
      coverImage: [0, [Validators.required, Validators.min(0)]],
    });
    this.appSettings$
      .pipe(filter((settings): settings is AppSettings => !!settings), take(1))
      .subscribe(settings => {
        if (settings.metadataMatchWeights) {
          this.form.patchValue(settings.metadataMatchWeights);
        }
      });
  }

  get orderedKeys(): string[] {
    return Object.keys(this.labelMap);
  }

  save(): void {
    if (this.form.invalid) return;

    this.isSaving = true;

    const payload = [
      {
        key: AppSettingKey.METADATA_MATCH_WEIGHTS,
        newValue: this.form.value
      }
    ];

    this.appSettingsService.saveSettings(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('settings.metadataMatchWeights.toast.saveSuccess.summary'),
          detail: this.translateService.instant('settings.metadataMatchWeights.toast.saveSuccess.detail')
        });
        this.isSaving = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('settings.metadataMatchWeights.toast.saveError.summary'),
          detail: this.translateService.instant('settings.metadataMatchWeights.toast.saveError.detail')
        });
        this.isSaving = false;
      }
    });
  }

  recalculate(): void {
    this.isRecalculating = true;
    this.weightsService.recalculateAll().subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('settings.metadataMatchWeights.toast.recalculateSuccess.summary'),
          detail: this.translateService.instant('settings.metadataMatchWeights.toast.recalculateSuccess.detail')
        });
        this.isRecalculating = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('settings.metadataMatchWeights.toast.recalculateError.summary'),
          detail: this.translateService.instant('settings.metadataMatchWeights.toast.recalculateError.detail')
        });
        this.isRecalculating = false;
      }
    });
  }
}
