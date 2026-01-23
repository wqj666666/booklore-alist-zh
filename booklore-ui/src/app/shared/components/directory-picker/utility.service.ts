import {inject, Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {HttpClient, HttpParams} from '@angular/common/http';
import {API_CONFIG} from '../../../core/config/api-config';
import {catchError, map} from 'rxjs/operators';

export type StorageType = 'local' | 'alist';

export interface AlistStatus {
  enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UtilityService {

  private pathUrl = `${API_CONFIG.BASE_URL}/api/v1/path`;
  private alistUrl = `${API_CONFIG.BASE_URL}/api/settings/alist`;

  private http = inject(HttpClient);

  /**
   * Get local filesystem folders at path
   */
  getFolders(path: string): Observable<string[]> {
    const params = new HttpParams().set('path', path);
    return this.http.get<string[]>(this.pathUrl, {params});
  }

  /**
   * Get AList folders at path
   */
  getAlistFolders(path: string): Observable<string[]> {
    const params = new HttpParams().set('path', path);
    return this.http.get<string[]>(`${this.alistUrl}/browse`, {params});
  }

  /**
   * Get folders based on storage type
   */
  getFoldersByType(path: string, storageType: StorageType): Observable<string[]> {
    if (storageType === 'alist') {
      return this.getAlistFolders(path);
    }
    return this.getFolders(path);
  }

  /**
   * Check if AList is enabled
   */
  getAlistStatus(): Observable<AlistStatus> {
    return this.http.get<AlistStatus>(`${this.alistUrl}/status`).pipe(
      catchError(() => of({enabled: false}))
    );
  }

  /**
   * Check if AList is enabled (returns boolean)
   */
  isAlistEnabled(): Observable<boolean> {
    return this.getAlistStatus().pipe(
      map(status => status.enabled)
    );
  }
}
