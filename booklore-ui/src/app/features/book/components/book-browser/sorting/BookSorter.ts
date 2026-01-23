import {SortDirection, SortOption} from '../../../model/sort.model';

export type SortOptionWithKey = SortOption & { labelKey: string };

export class BookSorter {
  selectedSort: SortOption | undefined = undefined;

  sortOptions: SortOptionWithKey[] = [
    {labelKey: 'book.browser.sort.title', label: '', field: 'title', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.titleSeries', label: '', field: 'titleSeries', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.fileName', label: '', field: 'fileName', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.author', label: '', field: 'author', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.authorSeries', label: '', field: 'authorSeries', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.lastRead', label: '', field: 'lastReadTime', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.personalRating', label: '', field: 'personalRating', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.addedOn', label: '', field: 'addedOn', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.fileSize', label: '', field: 'fileSizeKb', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.locked', label: '', field: 'locked', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.publisher', label: '', field: 'publisher', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.publishedDate', label: '', field: 'publishedDate', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.amazonRating', label: '', field: 'amazonRating', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.amazonReviewCount', label: '', field: 'amazonReviewCount', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.goodreadsRating', label: '', field: 'goodreadsRating', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.goodreadsReviewCount', label: '', field: 'goodreadsReviewCount', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.hardcoverRating', label: '', field: 'hardcoverRating', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.hardcoverReviewCount', label: '', field: 'hardcoverReviewCount', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.ranobedbRating', label: '', field: 'ranobedbRating', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.pageCount', label: '', field: 'pageCount', direction: SortDirection.ASCENDING},
    {labelKey: 'book.browser.sort.random', label: '', field: 'random', direction: SortDirection.ASCENDING},
  ];

  constructor(private applySortOption: (sort: SortOption) => void) {
  }

  updateLabels(getLabel: (key: string) => string): void {
    this.sortOptions = this.sortOptions.map(opt => ({
      ...opt,
      label: getLabel(opt.labelKey) || opt.label
    }));
  }

  sortBooks(field: string): void {
    const existingSort = this.sortOptions.find(opt => opt.field === field);
    if (!existingSort) return;

    if (this.selectedSort?.field === field) {
      this.selectedSort = {
        ...this.selectedSort,
        direction: this.selectedSort.direction === SortDirection.ASCENDING
          ? SortDirection.DESCENDING
          : SortDirection.ASCENDING
      };
    } else {
      this.selectedSort = {
        label: existingSort.label,
        field: existingSort.field,
        direction: SortDirection.ASCENDING
      };
    }

    this.updateSortOptions();
    this.applySortOption(this.selectedSort);
  }

  updateSortOptions() {
    const directionIcon = this.selectedSort!.direction === SortDirection.ASCENDING ? 'pi pi-arrow-up' : 'pi pi-arrow-down';
    this.sortOptions = this.sortOptions.map((option) => ({
      ...option,
      icon: option.field === this.selectedSort!.field ? directionIcon : '',
    }));
  }
}
