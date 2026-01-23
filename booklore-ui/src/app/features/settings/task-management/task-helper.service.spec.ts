import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {EnvironmentInjector, runInInjectionContext} from '@angular/core';
import {of, throwError} from 'rxjs';
import {TaskHelperService} from './task-helper.service';
import {TaskCreateRequest, TaskService, TaskType} from './task.service';
import {MessageService} from 'primeng/api';
import {MetadataRefreshRequest} from '../../metadata/model/request/metadata-refresh-request.model';
import {MetadataRefreshType} from '../../metadata/model/request/metadata-refresh-type.enum';
import {TranslateService} from '@ngx-translate/core';

describe('TaskHelperService', () => {
  let service: TaskHelperService;
  let taskServiceMock: any;
  let messageServiceMock: any;
  let translateServiceMock: any;

  beforeEach(() => {
    taskServiceMock = {
      startTask: vi.fn()
    };
    messageServiceMock = {
      add: vi.fn()
    };
    translateServiceMock = {
      instant: vi.fn((key: string) => key)
    };

    TestBed.configureTestingModule({
      providers: [
        TaskHelperService,
        {provide: TaskService, useValue: taskServiceMock},
        {provide: MessageService, useValue: messageServiceMock},
        {provide: TranslateService, useValue: translateServiceMock}
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);
    service = runInInjectionContext(injector, () => TestBed.inject(TaskHelperService));
  });

  it('should schedule metadata refresh and show success message', () => {
    taskServiceMock.startTask.mockReturnValue(of({}));
    const options: MetadataRefreshRequest = {refreshType: MetadataRefreshType.BOOKS, bookIds: [1, 2]};
    service.refreshMetadataTask(options).subscribe(result => {
      expect(result).toEqual({success: true});
      expect(taskServiceMock.startTask).toHaveBeenCalledWith({
        taskType: TaskType.REFRESH_METADATA_MANUAL,
        options
      });
      expect(messageServiceMock.add).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'success',
        summary: 'settings.taskManagement.toast.metadataUpdateScheduled.summary'
      }));
    });
  });

  it('should show error message if task already running (409)', () => {
    taskServiceMock.startTask.mockReturnValue(throwError(() => ({status: 409})));
    const options: MetadataRefreshRequest = {refreshType: MetadataRefreshType.BOOKS, bookIds: [1]};
    service.refreshMetadataTask(options).subscribe(result => {
      expect(result).toEqual({success: false});
      expect(messageServiceMock.add).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'error',
        summary: 'settings.taskManagement.toast.metadataUpdateAlreadyRunning.summary'
      }));
    });
  });

  it('should show generic error message for other errors', () => {
    taskServiceMock.startTask.mockReturnValue(throwError(() => ({status: 500})));
    const options: MetadataRefreshRequest = {refreshType: MetadataRefreshType.BOOKS, bookIds: [1]};
    service.refreshMetadataTask(options).subscribe(result => {
      expect(result).toEqual({success: false});
      expect(messageServiceMock.add).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'error',
        summary: 'settings.taskManagement.toast.metadataUpdateFailed.summary'
      }));
    });
  });
});

describe('TaskHelperService - API Contract Tests', () => {
  let service: TaskHelperService;
  let taskServiceMock: any;
  let messageServiceMock: any;
  let translateServiceMock: any;

  beforeEach(() => {
    taskServiceMock = {
      startTask: vi.fn()
    };
    messageServiceMock = {
      add: vi.fn()
    };
    translateServiceMock = {
      instant: vi.fn((key: string) => key)
    };

    TestBed.configureTestingModule({
      providers: [
        TaskHelperService,
        {provide: TaskService, useValue: taskServiceMock},
        {provide: MessageService, useValue: messageServiceMock},
        {provide: TranslateService, useValue: translateServiceMock}
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);
    service = runInInjectionContext(injector, () => TestBed.inject(TaskHelperService));
  });

  it('should send TaskCreateRequest with correct structure', () => {
    taskServiceMock.startTask.mockReturnValue(of({}));
    const options: MetadataRefreshRequest = {refreshType: MetadataRefreshType.BOOKS, bookIds: [1, 2, 3]};
    service.refreshMetadataTask(options).subscribe(() => {
      const req: TaskCreateRequest = taskServiceMock.startTask.mock.calls[0][0];
      expect(req).toHaveProperty('taskType', TaskType.REFRESH_METADATA_MANUAL);
      expect(req).toHaveProperty('options', options);
    });
  });

  it('should expect {success: true} on success', () => {
    taskServiceMock.startTask.mockReturnValue(of({}));
    service.refreshMetadataTask({refreshType: MetadataRefreshType.BOOKS, bookIds: [1]}).subscribe(result => {
      expect(result).toEqual({success: true});
    });
  });

  it('should expect {success: false} on error', () => {
    taskServiceMock.startTask.mockReturnValue(throwError(() => ({status: 409})));
    service.refreshMetadataTask({refreshType: MetadataRefreshType.BOOKS, bookIds: [1]}).subscribe(result => {
      expect(result).toEqual({success: false});
    });
  });

  it('should call MessageService.add with correct contract', () => {
    taskServiceMock.startTask.mockReturnValue(of({}));
    service.refreshMetadataTask({refreshType: MetadataRefreshType.BOOKS, bookIds: [1]}).subscribe(() => {
      expect(messageServiceMock.add).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String)
      }));
    });
  });
});
