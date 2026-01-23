import {
  fileSizeRanges,
  matchScoreRanges,
  pageCountRanges,
  ratingOptions10,
  ratingRanges
} from './book-filter/book-filter.component';

export class FilterLabelHelper {
  private static readonly FILTER_TYPE_MAP: Record<string, string> = {
    author: 'book.filter.type.author',
    category: 'book.filter.type.category',
    series: 'book.filter.type.series',
    publisher: 'book.filter.type.publisher',
    readStatus: 'book.filter.type.readStatus',
    personalRating: 'book.filter.type.personalRating',
    publishedDate: 'book.filter.type.publishedDate',
    matchScore: 'book.filter.type.matchScore',
    language: 'book.filter.type.language',
    bookType: 'book.filter.type.bookType',
    shelfStatus: 'book.filter.type.shelfStatus',
    fileSize: 'book.filter.type.fileSize',
    pageCount: 'book.filter.type.pageCount',
    amazonRating: 'book.filter.type.amazonRating',
    goodreadsRating: 'book.filter.type.goodreadsRating',
    hardcoverRating: 'book.filter.type.hardcoverRating',
    ranobedbRating: 'book.filter.type.ranobedbRating',
    mood: 'book.filter.type.mood',
    tag: 'book.filter.type.tag',
  };

  static getFilterTypeName(filterType: string): string {
    return this.FILTER_TYPE_MAP[filterType] || '';
  }

  static getFilterDisplayValue(filterType: string, value: string): string {
    switch (filterType.toLowerCase()) {
      case 'filesize':
        {
          const fileSizeRange = fileSizeRanges.find(r => r.id === value);
          const fileSizeRangeLower = fileSizeRanges.find(r => r.id === value.toLowerCase());
          const id = fileSizeRange?.id ?? fileSizeRangeLower?.id;
          const key = id ? this.getFileSizeLabelKey(id) : '';
          if (key) return key;
          return value;
        }
      case 'pagecount':
        {
          const pageCountRange = pageCountRanges.find(r => r.id === value);
          const pageCountRangeLower = pageCountRanges.find(r => r.id === value.toLowerCase());
          const id = pageCountRange?.id ?? pageCountRangeLower?.id;
          const key = id ? this.getPageCountLabelKey(id) : '';
          if (key) return key;
          return value;
        }
      case 'matchscore':
        {
          const matchScoreRange = matchScoreRanges.find(r => r.id === value);
          const matchScoreRangeLower = matchScoreRanges.find(r => r.id === value.toLowerCase());
          const id = matchScoreRange?.id ?? matchScoreRangeLower?.id;
          const key = id ? this.getMatchScoreLabelKey(id) : '';
          if (key) return key;
          return value;
        }
      case 'personalrating':
        {
          const personalRating = ratingOptions10.find(r => r.id === value);
          const personalRatingLower = ratingOptions10.find(r => r.id === value.toLowerCase());
          const label = personalRating?.label ?? personalRatingLower?.label;
          if (label) return label;
          return value;
        }
      case 'amazonrating':
      case 'goodreadsrating':
      case 'hardcoverrating':
      case 'ranobedbrating':
        {
          const ratingRange = ratingRanges.find(r => r.id === value);
          const ratingRangeLower = ratingRanges.find(r => r.id === value.toLowerCase());
          const id = ratingRange?.id ?? ratingRangeLower?.id;
          const key = id ? this.getRatingRangeLabelKey(id) : '';
          if (key) return key;
          return value;
        }
      case 'shelfstatus':
        if (value === 'shelved') return 'book.filter.shelfStatus.shelved';
        if (value === 'unshelved') return 'book.filter.shelfStatus.unshelved';
        return value;
      default:
        return value;
    }
  }

  private static getFileSizeLabelKey(id: string): string {
    switch (id) {
      case '<1mb':
        return 'book.filter.value.fileSize.lt1mb';
      case '1to10mb':
        return 'book.filter.value.fileSize.mb1to10';
      case '10to50mb':
        return 'book.filter.value.fileSize.mb10to50';
      case '50to100mb':
        return 'book.filter.value.fileSize.mb50to100';
      case '250to500mb':
        return 'book.filter.value.fileSize.mb250to500';
      case '500mbto1gb':
        return 'book.filter.value.fileSize.gb05to1';
      case '1to2gb':
        return 'book.filter.value.fileSize.gb1to2';
      case '5plusgb':
        return 'book.filter.value.fileSize.gb5plus';
      default:
        return '';
    }
  }

  private static getPageCountLabelKey(id: string): string {
    switch (id) {
      case '<50':
        return 'book.filter.value.pageCount.lt50';
      case '50to100':
        return 'book.filter.value.pageCount.p50to100';
      case '100to200':
        return 'book.filter.value.pageCount.p100to200';
      case '200to400':
        return 'book.filter.value.pageCount.p200to400';
      case '400to600':
        return 'book.filter.value.pageCount.p400to600';
      case '600to1000':
        return 'book.filter.value.pageCount.p600to1000';
      case '1000plus':
        return 'book.filter.value.pageCount.p1000plus';
      default:
        return '';
    }
  }

  private static getRatingRangeLabelKey(id: string): string {
    switch (id) {
      case '0to1':
        return 'book.filter.value.rating.r0to1';
      case '1to2':
        return 'book.filter.value.rating.r1to2';
      case '2to3':
        return 'book.filter.value.rating.r2to3';
      case '3to4':
        return 'book.filter.value.rating.r3to4';
      case '4to4.5':
        return 'book.filter.value.rating.r4to45';
      case '4.5plus':
        return 'book.filter.value.rating.r45plus';
      default:
        return '';
    }
  }

  private static getMatchScoreLabelKey(id: string): string {
    switch (id) {
      case '0.95-1.0':
        return 'book.filter.value.matchScore.m95to100';
      case '0.90-0.94':
        return 'book.filter.value.matchScore.m90to94';
      case '0.80-0.89':
        return 'book.filter.value.matchScore.m80to89';
      case '0.70-0.79':
        return 'book.filter.value.matchScore.m70to79';
      case '0.50-0.69':
        return 'book.filter.value.matchScore.m50to69';
      case '0.30-0.49':
        return 'book.filter.value.matchScore.m30to49';
      case '0.00-0.29':
        return 'book.filter.value.matchScore.m0to29';
      default:
        return '';
    }
  }
}
