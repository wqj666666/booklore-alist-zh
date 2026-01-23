import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {Select} from 'primeng/select';
import {SidebarLibrarySorting, SidebarMagicShelfSorting, SidebarShelfSorting, User, UserService, UserSettings, UserState} from '../../user-management/user.service';
import {MessageService} from 'primeng/api';
import {Observable, Subject} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {filter, takeUntil} from 'rxjs/operators';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-sidebar-sorting-preferences',
  imports: [
    Select,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './sidebar-sorting-preferences.component.html',
  styleUrl: './sidebar-sorting-preferences.component.scss'
})
export class SidebarSortingPreferencesComponent implements OnInit, OnDestroy {

  sortingOptions: {label: string; value: {field: string; order: 'asc' | 'desc'}}[] = [];

  selectedLibrarySorting: SidebarLibrarySorting = {field: 'id', order: 'asc'};
  selectedShelfSorting: SidebarShelfSorting = {field: 'id', order: 'asc'};
  selectedMagicShelfSorting: SidebarMagicShelfSorting = {field: 'id', order: 'asc'};

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
    this.selectedLibrarySorting = settings.sidebarLibrarySorting;
    this.selectedShelfSorting = settings.sidebarShelfSorting;
    this.selectedMagicShelfSorting = settings.sidebarMagicShelfSorting;
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

  onLibrarySortingChange() {
    this.updatePreference(['sidebarLibrarySorting'], this.selectedLibrarySorting);
  }

  onShelfSortingChange() {
    this.updatePreference(['sidebarShelfSorting'], this.selectedShelfSorting);
  }

  onMagicShelfSortingChange() {
    this.updatePreference(['sidebarMagicShelfSorting'], this.selectedMagicShelfSorting);
  }

  private rebuildOptions(): void {
    this.sortingOptions = [
      {label: this.translateService.instant('settings.sidebarSortingPreferences.option.nameAsc'), value: {field: 'name', order: 'asc'}},
      {label: this.translateService.instant('settings.sidebarSortingPreferences.option.nameDesc'), value: {field: 'name', order: 'desc'}},
      {label: this.translateService.instant('settings.sidebarSortingPreferences.option.creationDateAsc'), value: {field: 'id', order: 'asc'}},
      {label: this.translateService.instant('settings.sidebarSortingPreferences.option.creationDateDesc'), value: {field: 'id', order: 'desc'}},
    ];
  }
}
