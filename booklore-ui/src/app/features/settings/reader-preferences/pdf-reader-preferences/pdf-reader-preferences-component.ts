import {Component, inject, Input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ReaderPreferencesService} from '../reader-preferences.service';
import {PageSpread, UserSettings} from '../../user-management/user.service';
import {TooltipModule} from 'primeng/tooltip';
import {TranslateModule} from '@ngx-translate/core';

@Component({
  selector: 'app-pdf-reader-preferences-component',
  imports: [
    FormsModule,
    TooltipModule,
    TranslateModule
  ],
  templateUrl: './pdf-reader-preferences-component.html',
  styleUrl: './pdf-reader-preferences-component.scss'
})
export class PdfReaderPreferencesComponent {
  private readonly readerPreferencesService = inject(ReaderPreferencesService);

  @Input() userSettings!: UserSettings;

  readonly spreads: {name: string; key: PageSpread; icon: string}[] = [
    {name: 'settings.readerPreferences.options.pageSpread.even', key: 'even', icon: 'pi pi-align-left'},
    {name: 'settings.readerPreferences.options.pageSpread.odd', key: 'odd', icon: 'pi pi-align-right'},
    {name: 'settings.readerPreferences.options.pageSpread.none', key: 'off', icon: 'pi pi-minus'}
  ];

  readonly zooms: {name: string; key: string; icon: string}[] = [
    {name: 'settings.readerPreferences.options.zoom.auto', key: 'auto', icon: 'pi pi-sparkles'},
    {name: 'settings.readerPreferences.options.zoom.pageFit', key: 'page-fit', icon: 'pi pi-window-maximize'},
    {name: 'settings.readerPreferences.options.zoom.pageWidth', key: 'page-width', icon: 'pi pi-arrows-h'},
    {name: 'settings.readerPreferences.options.zoom.actualSize', key: 'page-actual', icon: 'pi pi-expand'}
  ];

  get selectedSpread(): 'even' | 'odd' | 'off' {
    return this.userSettings.pdfReaderSetting.pageSpread;
  }

  set selectedSpread(value: 'even' | 'odd' | 'off') {
    this.userSettings.pdfReaderSetting.pageSpread = value;
    this.readerPreferencesService.updatePreference(['pdfReaderSetting', 'pageSpread'], value);
  }

  get selectedZoom(): string {
    return this.userSettings.pdfReaderSetting.pageZoom;
  }

  set selectedZoom(value: string) {
    this.userSettings.pdfReaderSetting.pageZoom = value;
    this.readerPreferencesService.updatePreference(['pdfReaderSetting', 'pageZoom'], value);
  }
}
