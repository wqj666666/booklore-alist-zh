import {inject, Injectable} from '@angular/core';
import {MessageService} from 'primeng/api';
import {MetadataRefreshRequest} from '../../metadata/model/request/metadata-refresh-request.model';
import {catchError, map} from 'rxjs/operators';
import {of} from 'rxjs';
import {TaskCreateRequest, TaskService, TaskType} from './task.service';
import {TranslateService} from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class TaskHelperService {
  private taskService = inject(TaskService);
  private messageService = inject(MessageService);
  private translateService = inject(TranslateService);

  refreshMetadataTask(options: MetadataRefreshRequest) {
    const request: TaskCreateRequest = {
      taskType: TaskType.REFRESH_METADATA_MANUAL,
      options
    };
    return this.taskService.startTask(request).pipe(
      map(() => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('settings.taskManagement.toast.metadataUpdateScheduled.summary'),
          detail: this.translateService.instant('settings.taskManagement.toast.metadataUpdateScheduled.detail')
        });
        return {success: true};
      }),
      catchError((e) => {
        if (e.status === 409) {
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('settings.taskManagement.toast.metadataUpdateAlreadyRunning.summary'),
            life: 5000,
            detail: this.translateService.instant('settings.taskManagement.toast.metadataUpdateAlreadyRunning.detail')
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('settings.taskManagement.toast.metadataUpdateFailed.summary'),
            life: 5000,
            detail: this.translateService.instant('settings.taskManagement.toast.metadataUpdateFailed.detail')
          });
        }
        return of({success: false});
      })
    );
  }
}
