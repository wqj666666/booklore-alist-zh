import {describe, expect, it, vi} from 'vitest';
import {FilterLabelHelper} from './filter-label.helper';

vi.mock('./book-filter/book-filter.component', () => ({
  fileSizeRanges: [
    {id: '<1mb', label: '< 1 MB'},
    {id: '1to10mb', label: '1–10 MB'}
  ],
  pageCountRanges: [
    {id: '<50', label: '< 50 pages'},
    {id: '50to100', label: '50–100 pages'}
  ],
  matchScoreRanges: [
    {id: '0.95-1.0', label: 'Outstanding (95–100%)'},
    {id: '0.90-0.94', label: 'Excellent (90–94%)'}
  ],
  ratingOptions10: [
    {id: '5', label: '5'},
    {id: '10', label: '10'}
  ],
  ratingRanges: [
    {id: '0to1', label: '0 to 1'},
    {id: '1to2', label: '1 to 2'}
  ]
}));

describe('FilterLabelHelper', () => {
  describe('getFilterTypeName', () => {
    it('should return mapped label for known filter type', () => {
      expect(FilterLabelHelper.getFilterTypeName('author')).toBe('book.filter.type.author');
      expect(FilterLabelHelper.getFilterTypeName('category')).toBe('book.filter.type.category');
      expect(FilterLabelHelper.getFilterTypeName('series')).toBe('book.filter.type.series');
    });

    it('should return empty string for unknown filter type', () => {
      expect(FilterLabelHelper.getFilterTypeName('unknownType')).toBe('');
      expect(FilterLabelHelper.getFilterTypeName('custom')).toBe('');
    });
  });

  describe('getFilterDisplayValue', () => {
    it('should return file size label for known id', () => {
      expect(FilterLabelHelper.getFilterDisplayValue('fileSize', '<1mb')).toBe('book.filter.value.fileSize.lt1mb');
      expect(FilterLabelHelper.getFilterDisplayValue('filesize', '1to10mb')).toBe('book.filter.value.fileSize.mb1to10');
    });

    it('should return value if file size id not found', () => {
      expect(FilterLabelHelper.getFilterDisplayValue('fileSize', 'unknown')).toBe('unknown');
    });

    it('should return page count label for known id', () => {
      expect(FilterLabelHelper.getFilterDisplayValue('pageCount', '<50')).toBe('book.filter.value.pageCount.lt50');
      expect(FilterLabelHelper.getFilterDisplayValue('pagecount', '50to100')).toBe('book.filter.value.pageCount.p50to100');
    });

    it('should return value if page count id not found', () => {
      expect(FilterLabelHelper.getFilterDisplayValue('pageCount', 'unknown')).toBe('unknown');
    });

    it('should return match score label for known id', () => {
      expect(FilterLabelHelper.getFilterDisplayValue('matchScore', '0.95-1.0')).toBe('book.filter.value.matchScore.m95to100');
      expect(FilterLabelHelper.getFilterDisplayValue('matchscore', '0.90-0.94')).toBe('book.filter.value.matchScore.m90to94');
    });

    it('should return value if match score id not found', () => {
      expect(FilterLabelHelper.getFilterDisplayValue('matchScore', 'unknown')).toBe('unknown');
    });

    it('should return personal rating label for known id', () => {
      expect(FilterLabelHelper.getFilterDisplayValue('personalRating', '5')).toBe('5');
      expect(FilterLabelHelper.getFilterDisplayValue('personalrating', '10')).toBe('10');
    });

    it('should return value if personal rating id not found', () => {
      expect(FilterLabelHelper.getFilterDisplayValue('personalRating', 'unknown')).toBe('unknown');
    });

    it('should return rating range label key for amazon/goodreads/hardcover/ranobedb', () => {
      expect(FilterLabelHelper.getFilterDisplayValue('amazonRating', '0to1')).toBe('book.filter.value.rating.r0to1');
      expect(FilterLabelHelper.getFilterDisplayValue('goodreadsRating', '1to2')).toBe('book.filter.value.rating.r1to2');
      expect(FilterLabelHelper.getFilterDisplayValue('hardcoverRating', '0to1')).toBe('book.filter.value.rating.r0to1');
      expect(FilterLabelHelper.getFilterDisplayValue('ranobedbRating', '1to2')).toBe('book.filter.value.rating.r1to2');
    });

    it('should return value if rating range id not found', () => {
      expect(FilterLabelHelper.getFilterDisplayValue('amazonRating', 'unknown')).toBe('unknown');
      expect(FilterLabelHelper.getFilterDisplayValue('goodreadsRating', 'unknown')).toBe('unknown');
      expect(FilterLabelHelper.getFilterDisplayValue('hardcoverRating', 'unknown')).toBe('unknown');
    });

    it('should return shelf status label key for shelved/unshelved', () => {
      expect(FilterLabelHelper.getFilterDisplayValue('shelfStatus', 'shelved')).toBe('book.filter.shelfStatus.shelved');
      expect(FilterLabelHelper.getFilterDisplayValue('shelfStatus', 'unshelved')).toBe('book.filter.shelfStatus.unshelved');
    });

    it('should return value for unknown filter type', () => {
      expect(FilterLabelHelper.getFilterDisplayValue('unknownType', 'someValue')).toBe('someValue');
    });
  });
});
