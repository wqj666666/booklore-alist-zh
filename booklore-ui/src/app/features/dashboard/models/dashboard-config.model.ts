import {DEFAULT_MAX_ITEMS} from '../components/dashboard-settings/dashboard-settings.component';

export enum ScrollerType {
  LAST_READ = 'lastRead',
  LATEST_ADDED = 'latestAdded',
  RANDOM = 'random',
  MAGIC_SHELF = 'magicShelf'
}

export interface ScrollerConfig {
  id: string;
  type: ScrollerType;
  title: string;
  titleKey?: string;
  enabled: boolean;
  order: number;
  maxItems: number;
  magicShelfId?: number;
  sortField?: string;
  sortDirection?: string;
}

export interface DashboardConfig {
  scrollers: ScrollerConfig[];
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  scrollers: [
    {id: '1', type: ScrollerType.LAST_READ, title: '', titleKey: 'dashboard.scrollerTypes.continueReading', enabled: true, order: 1, maxItems: DEFAULT_MAX_ITEMS},
    {id: '2', type: ScrollerType.LATEST_ADDED, title: '', titleKey: 'dashboard.scrollerTypes.recentlyAdded', enabled: true, order: 2, maxItems: DEFAULT_MAX_ITEMS},
    {id: '3', type: ScrollerType.RANDOM, title: '', titleKey: 'dashboard.scrollerTypes.discoverSomethingNew', enabled: true, order: 3, maxItems: DEFAULT_MAX_ITEMS}
  ]
};
