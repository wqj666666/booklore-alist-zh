import {Component, inject, Input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CbxBackgroundColor, CbxFitMode, CbxPageSpread, CbxPageViewMode, CbxScrollMode, UserSettings} from '../../user-management/user.service';
import {ReaderPreferencesService} from '../reader-preferences.service';
import {TooltipModule} from 'primeng/tooltip';
import {TranslateModule} from '@ngx-translate/core';

@Component({
  selector: 'app-cbx-reader-preferences-component',
  imports: [
    FormsModule,
    TooltipModule,
    TranslateModule
  ],
  templateUrl: './cbx-reader-preferences-component.html',
  styleUrl: './cbx-reader-preferences-component.scss'
})
export class CbxReaderPreferencesComponent {

  @Input() userSettings!: UserSettings;

  private readonly readerPreferencesService = inject(ReaderPreferencesService);

  private static readonly SETTING_ROOT = 'cbxReaderSetting';
  private static readonly PROP_PAGE_SPREAD = 'pageSpread';
  private static readonly PROP_PAGE_VIEW_MODE = 'pageViewMode';
  private static readonly PROP_FIT_MODE = 'fitMode';
  private static readonly PROP_SCROLL_MODE = 'scrollMode';
  private static readonly PROP_BACKGROUND_COLOR = 'backgroundColor';

  readonly cbxSpreads = [
    {name: 'settings.readerPreferences.options.pageSpread.even', key: CbxPageSpread.EVEN, icon: 'pi pi-align-left'},
    {name: 'settings.readerPreferences.options.pageSpread.odd', key: CbxPageSpread.ODD, icon: 'pi pi-align-right'}
  ];

  readonly cbxViewModes = [
    {name: 'settings.readerPreferences.options.cbxViewMode.singlePage', key: CbxPageViewMode.SINGLE_PAGE, icon: 'pi pi-book'},
    {name: 'settings.readerPreferences.options.cbxViewMode.twoPage', key: CbxPageViewMode.TWO_PAGE, icon: 'pi pi-copy'},
  ];

  readonly cbxFitModes = [
    {name: 'settings.readerPreferences.options.fitMode.fitPage', key: CbxFitMode.FIT_PAGE, icon: 'pi pi-window-maximize'},
    {name: 'settings.readerPreferences.options.fitMode.fitWidth', key: CbxFitMode.FIT_WIDTH, icon: 'pi pi-arrows-h'},
    {name: 'settings.readerPreferences.options.fitMode.fitHeight', key: CbxFitMode.FIT_HEIGHT, icon: 'pi pi-arrows-v'},
    {name: 'settings.readerPreferences.options.fitMode.actualSize', key: CbxFitMode.ACTUAL_SIZE, icon: 'pi pi-expand'},
    {name: 'settings.readerPreferences.options.fitMode.automatic', key: CbxFitMode.AUTO, icon: 'pi pi-sparkles'}
  ];

  readonly cbxScrollModes = [
    {name: 'settings.readerPreferences.options.flow.paginated', key: CbxScrollMode.PAGINATED, icon: 'pi pi-book'},
    {name: 'settings.readerPreferences.options.scrollMode.infinite', key: CbxScrollMode.INFINITE, icon: 'pi pi-sort-alt'}
  ];

  readonly cbxBackgroundColors = [
    {name: 'settings.readerPreferences.options.backgroundColor.gray', key: CbxBackgroundColor.GRAY, color: '#808080'},
    {name: 'settings.readerPreferences.options.backgroundColor.black', key: CbxBackgroundColor.BLACK, color: '#000000'},
    {name: 'settings.readerPreferences.options.backgroundColor.white', key: CbxBackgroundColor.WHITE, color: '#FFFFFF'}
  ];

  get selectedCbxSpread(): CbxPageSpread {
    return this.userSettings.cbxReaderSetting.pageSpread ?? CbxPageSpread.EVEN;
  }

  set selectedCbxSpread(value: CbxPageSpread) {
    this.userSettings.cbxReaderSetting.pageSpread = value;
    this.readerPreferencesService.updatePreference([CbxReaderPreferencesComponent.SETTING_ROOT, CbxReaderPreferencesComponent.PROP_PAGE_SPREAD], value);
  }

  get selectedCbxViewMode(): CbxPageViewMode {
    return this.userSettings.cbxReaderSetting.pageViewMode ?? CbxPageViewMode.SINGLE_PAGE;
  }

  set selectedCbxViewMode(value: CbxPageViewMode) {
    this.userSettings.cbxReaderSetting.pageViewMode = value;
    this.readerPreferencesService.updatePreference([CbxReaderPreferencesComponent.SETTING_ROOT, CbxReaderPreferencesComponent.PROP_PAGE_VIEW_MODE], value);
  }

  get selectedCbxFitMode(): CbxFitMode {
    return this.userSettings.cbxReaderSetting.fitMode ?? CbxFitMode.FIT_PAGE;
  }

  set selectedCbxFitMode(value: CbxFitMode) {
    this.userSettings.cbxReaderSetting.fitMode = value;
    this.readerPreferencesService.updatePreference([CbxReaderPreferencesComponent.SETTING_ROOT, CbxReaderPreferencesComponent.PROP_FIT_MODE], value);
  }

  get selectedCbxScrollMode(): CbxScrollMode {
    return this.userSettings.cbxReaderSetting.scrollMode ?? CbxScrollMode.PAGINATED;
  }

  set selectedCbxScrollMode(value: CbxScrollMode) {
    this.userSettings.cbxReaderSetting.scrollMode = value;
    this.readerPreferencesService.updatePreference([CbxReaderPreferencesComponent.SETTING_ROOT, CbxReaderPreferencesComponent.PROP_SCROLL_MODE], value);
  }

  get selectedCbxBackgroundColor(): CbxBackgroundColor {
    return this.userSettings.cbxReaderSetting.backgroundColor ?? CbxBackgroundColor.GRAY;
  }

  set selectedCbxBackgroundColor(value: CbxBackgroundColor) {
    this.userSettings.cbxReaderSetting.backgroundColor = value;
    this.readerPreferencesService.updatePreference([CbxReaderPreferencesComponent.SETTING_ROOT, CbxReaderPreferencesComponent.PROP_BACKGROUND_COLOR], value);
  }
}
