import {Component, inject, OnInit} from '@angular/core';
import {NgClass} from '@angular/common';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';
import {StorageType, UtilityService} from './utility.service';
import {TableModule} from 'primeng/table';
import {InputText} from 'primeng/inputtext';

import {FormsModule} from '@angular/forms';
import {ProgressSpinner} from 'primeng/progressspinner';
import {MenuItem} from 'primeng/api';
import {CheckboxModule} from 'primeng/checkbox';
import {InputIcon} from 'primeng/inputicon';
import {Button} from 'primeng/button';
import {IconField} from 'primeng/iconfield';
import {Tooltip} from 'primeng/tooltip';
import {TranslateModule} from '@ngx-translate/core';

export interface DirectoryPickerResult {
  folders: string[];
  storageType: StorageType;
}

@Component({
  selector: 'app-directory-picker-v2',
  standalone: true,
  templateUrl: './directory-picker.component.html',
  imports: [
    TableModule,
    InputText,
    FormsModule,
    ProgressSpinner,
    CheckboxModule,
    InputIcon,
    Button,
    InputIcon,
    IconField,
    Tooltip,
    TranslateModule,
    NgClass
  ],
  styleUrls: ['./directory-picker.component.scss']
})
export class DirectoryPickerComponent implements OnInit {
  value: unknown;
  paths: string[] = [];
  filteredPaths: string[] = [];
  selectedProductName: string = '';
  selectedFolders: string[] = [];
  selectedFoldersMap: Record<string, boolean> = {};
  searchQuery: string = '';
  isLoading: boolean = false;
  breadcrumbItems: MenuItem[] = [];
  home: MenuItem = {icon: 'pi pi-home', command: () => this.navigateToRoot()};

  // Storage type support
  storageType: StorageType = 'local';
  alistEnabled: boolean = false;

  private utilityService = inject(UtilityService);
  private dynamicDialogRef = inject(DynamicDialogRef);
  private dynamicDialogConfig = inject(DynamicDialogConfig);

  ngOnInit() {
    // Check if AList is enabled
    this.utilityService.isAlistEnabled().subscribe(enabled => {
      this.alistEnabled = enabled;
    });

    // Get initial storage type from dialog config
    const data = this.dynamicDialogConfig?.data;
    if (data?.storageType) {
      this.storageType = data.storageType;
    }

    const initialPath = '/';
    this.getFolders(initialPath);
  }

  switchStorageType(type: StorageType): void {
    if (this.storageType === type) return;

    this.storageType = type;
    this.selectedFolders = [];
    this.selectedFoldersMap = {};
    this.searchQuery = '';
    this.navigateToRoot();
  }

  getFolders(path: string): void {
    this.isLoading = true;
    this.filteredPaths = [];
    this.utilityService.getFoldersByType(path, this.storageType).subscribe({
      next: (folders: string[]) => {
        setTimeout(() => {
          this.paths = folders;
          this.filteredPaths = folders;
          this.isLoading = false;
          this.updateBreadcrumb(path);
          folders.forEach(folder => {
            this.selectedFoldersMap[folder] = this.selectedFolders.includes(folder);
          });
        }, 100);
      },
      error: (error) => {
        console.error('Error fetching folders:', error);
        this.isLoading = false;
      }
    });
  }

  updateBreadcrumb(path: string): void {
    if (path === '/' || path === '') {
      this.breadcrumbItems = [];
      return;
    }

    const parts = path.split('/').filter(p => p);
    this.breadcrumbItems = parts.map((part, index) => {
      const fullPath = '/' + parts.slice(0, index + 1).join('/');
      return {
        label: part,
        command: () => this.navigateToPath(fullPath)
      };
    });
  }

  navigateToRoot(): void {
    this.selectedProductName = '/';
    this.getFolders('/');
    this.searchQuery = '';
  }

  navigateToPath(path: string): void {
    this.selectedProductName = path;
    this.getFolders(path);
    this.searchQuery = '';
  }

  onRowClick(path: string): void {
    this.selectedProductName = path;
    this.getFolders(path);
    this.searchQuery = '';
  }

  onCheckboxChange(path: string, checked: boolean): void {
    const index = this.selectedFolders.indexOf(path);
    if (checked && index === -1) {
      this.selectedFolders.push(path);
    } else if (!checked && index > -1) {
      this.selectedFolders.splice(index, 1);
    }
  }

  isFolderSelected(path: string): boolean {
    return this.selectedFolders.includes(path);
  }

  goUp(): void {
    if (this.selectedProductName === '' || this.selectedProductName === '/') {
      return;
    }
    const result = this.selectedProductName.substring(0, this.selectedProductName.lastIndexOf('/')) || '/';
    this.selectedProductName = result;
    this.getFolders(result);
    this.searchQuery = '';
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredPaths = this.paths;
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredPaths = this.paths.filter(path =>
      path.toLowerCase().includes(query)
    );
  }

  onSelect(): void {
    const result: DirectoryPickerResult = {
      folders: this.selectedFolders,
      storageType: this.storageType
    };
    this.dynamicDialogRef.close(result);
  }

  onCancel(): void {
    this.dynamicDialogRef.close(null);
  }

  getFolderName(path: string): string {
    return path.split('/').filter(p => p).pop() || path;
  }
}
