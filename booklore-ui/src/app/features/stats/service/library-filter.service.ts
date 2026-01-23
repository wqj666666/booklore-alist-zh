import {Injectable, inject} from '@angular/core';
import {BehaviorSubject, combineLatest, map, Observable} from 'rxjs';
import {BookService} from '../../book/service/book.service';
import {LibraryService} from '../../book/service/library.service';
import {TranslateService} from '@ngx-translate/core';
import {LanguageService} from '../../../core/i18n/language.service';

export interface LibraryOption {
  id: number | null;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class LibraryFilterService {
  private selectedLibrarySubject = new BehaviorSubject<number | null>(null);

  selectedLibrary$ = this.selectedLibrarySubject.asObservable();

  getCurrentSelectedLibrary(): number | null {
    return this.selectedLibrarySubject.value;
  }

  setSelectedLibrary(libraryId: number | null): void {
    this.selectedLibrarySubject.next(libraryId);
  }

  private bookService = inject(BookService);
  private libraryService = inject(LibraryService);
  private translateService = inject(TranslateService);
  private languageService = inject(LanguageService);

  getLibraryOptions(): Observable<LibraryOption[]> {
    return combineLatest([
      this.bookService.bookState$,
      this.libraryService.libraryState$,
      this.languageService.language$
    ]).pipe(
      map(([bookState, libraryState, _lang]) => {
        const allLibrariesLabel = this.translateService.instant('stats.library.allLibraries');
        if (!bookState.loaded || !bookState.books || bookState.books.length === 0) {
          return [{id: null, name: allLibrariesLabel}];
        }

        if (!libraryState.loaded || !libraryState.libraries) {
          return [{id: null, name: allLibrariesLabel}];
        }

        const libraryMap = new Map<number, string>();
        bookState.books.forEach(book => {
          if (!libraryMap.has(book.libraryId)) {
            const library = libraryState.libraries?.find(lib => lib.id === book.libraryId);
            const libraryName = library?.name || this.translateService.instant('stats.library.unnamedLibrary', {id: book.libraryId});
            libraryMap.set(book.libraryId, libraryName);
          }
        });

        const options: LibraryOption[] = [
          {id: null, name: allLibrariesLabel},
          ...Array.from(libraryMap.entries()).map(([id, name]) => ({id, name}))
        ];

        return options.sort((a, b) => {
          if (a.id === null) return -1;
          if (b.id === null) return 1;
          return a.name.localeCompare(b.name);
        });
      })
    );
  }
}
