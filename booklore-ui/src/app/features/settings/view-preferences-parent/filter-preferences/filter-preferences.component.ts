import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {Select} from 'primeng/select';
import {Tooltip} from 'primeng/tooltip';
import {BookFilterMode, FilterSortingMode, SidebarLibrarySorting, SidebarShelfSorting, User, UserService, UserSettings, UserState} from '../../user-management/user.service';
import {MessageService} from 'primeng/api';
import {Observable, Subject} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {filter, takeUntil} from 'rxjs/operators';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-filter-preferences',
  imports: [
    Select,
    Tooltip,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './filter-preferences.component.html',
  styleUrl: './filter-preferences.component.scss'
})
export class FilterPreferencesComponent implements OnInit, OnDestroy {

  filterModes: {label: string; value: BookFilterMode}[] = [];

  filterSortingModes: {label: string; value: FilterSortingMode}[] = [];

  selectedFilterMode: BookFilterMode = 'and';
  selectedFilterSortingMode: FilterSortingMode = 'alphabetical';
  
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly translateService = inject(TranslateService);
  private readonly destroy$ = new Subject<void>();

  userData$: Observable<UserState> = this.userService.userState$;
  private currentUser: User | null = null;

  ngOnInit(): void {
    this.rebuildOptions();
    this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => this.rebuildOptions());

    this.userData$.pipe(
      filter(userState => !!userState?.user && userState.loaded),
      takeUntil(this.destroy$)
    ).subscribe(userState => {
      this.currentUser = userState.user;
      this.loadPreferences(userState.user!.userSettings);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPreferences(settings: UserSettings): void {
    this.selectedFilterMode = settings.filterMode ?? 'and';
    this.selectedFilterSortingMode = settings.filterSortingMode ?? 'alphabetical';
  }

  private updatePreference(path: string[], value: unknown): void {
    if (!this.currentUser) return;

    let target: any = this.currentUser.userSettings;
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]] ||= {};
    }
    target[path.at(-1)!] = value;

    const [rootKey] = path;
    const updatedValue = this.currentUser.userSettings[rootKey as keyof UserSettings];
    this.userService.updateUserSetting(this.currentUser.id, rootKey, updatedValue);
    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('settings.toast.preferencesUpdated.summary'),
      detail: this.translateService.instant('settings.toast.preferencesUpdated.detail'),
      life: 1500
    });
  }

  onFilterModeChange() {
    this.updatePreference(['filterMode'], this.selectedFilterMode);
  }

  onFilterSortingModeChange() {
    this.updatePreference(['filterSortingMode'], this.selectedFilterSortingMode);
  }

  private rebuildOptions(): void {
    this.filterModes = [
      {label: this.translateService.instant('settings.filterPreferences.option.filterMode.and'), value: 'and'},
      {label: this.translateService.instant('settings.filterPreferences.option.filterMode.or'), value: 'or'},
      {label: this.translateService.instant('settings.filterPreferences.option.filterMode.single'), value: 'single'},
    ];

    this.filterSortingModes = [
      {label: this.translateService.instant('settings.filterPreferences.option.sortingMode.alphabetical'), value: 'alphabetical'},
      {label: this.translateService.instant('settings.filterPreferences.option.sortingMode.count'), value: 'count'},
    ];
  }
}
