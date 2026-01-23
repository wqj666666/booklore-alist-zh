import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Button} from 'primeng/button';
import {ProgressBar} from 'primeng/progressbar';
import {MessageService} from 'primeng/api';
import {Select} from 'primeng/select';
import {FormsModule} from '@angular/forms';
import {TaskInfo, MetadataReplaceMode, TaskHistory, TASK_TYPE_CONFIG, TaskCreateRequest, TaskCronConfigRequest, TaskProgressPayload, TaskService, TaskStatus, TaskType, LibraryRescanOptions} from './task.service';
import {MetadataRefreshRequest} from '../../metadata/model/request/metadata-refresh-request.model';
import {finalize, forkJoin, Subject, Subscription, takeUntil} from 'rxjs';
import {ExternalDocLinkComponent} from '../../../shared/components/external-doc-link/external-doc-link.component';
import {ToggleSwitch} from 'primeng/toggleswitch';
import {Badge} from 'primeng/badge';
import {Tooltip} from 'primeng/tooltip';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-task-management',
  standalone: true,
  imports: [
    CommonModule,
    Button,
    ProgressBar,
    Select,
    FormsModule,
    ExternalDocLinkComponent,
    ToggleSwitch,
    Badge,
    Tooltip,
    TranslateModule
  ],
  templateUrl: './task-management.component.html',
  styleUrl: './task-management.component.scss'
})
export class TaskManagementComponent implements OnInit, OnDestroy {
  // Services
  private messageService = inject(MessageService);
  private taskService = inject(TaskService);
  private translateService = inject(TranslateService);

  // State
  taskInfos: TaskInfo[] = [];
  taskHistories = new Map<string, TaskHistory>();
  loading = false;
  executingTasks = new Set<string>();
  private subscription?: Subscription;
  private readonly destroy$ = new Subject<void>();

  // Metadata Replace Options
  metadataReplaceOptions: Array<{ label: string; value: MetadataReplaceMode }> = [];
  selectedMetadataReplaceMode: MetadataReplaceMode = MetadataReplaceMode.REPLACE_MISSING;

  // Cron Editing State
  cronUpdating = false;
  editingCronTaskType: string | null = null;
  editingCronExpression: string = '';
  cronValidationError: string | null = null;

  // Constants
  private readonly STALE_TASK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  protected readonly TaskType = TaskType;

  // ============================================================================
  // Lifecycle Hooks
  // ============================================================================

  ngOnInit(): void {
    this.refreshMetadataReplaceOptions();
    this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => this.refreshMetadataReplaceOptions());
    this.loadTasks();
    this.subscribeToTaskProgress();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // Data Loading & Real-time Updates
  // ============================================================================

  loadTasks(): void {
    this.loading = true;

    forkJoin({
      available: this.taskService.getAvailableTasks(),
      latest: this.taskService.getLatestTasksForEachType()
    })
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: ({available, latest}) => {
          this.taskInfos = this.sortTasksByDisplayOrder(available);
          this.taskHistories.clear();
          latest.taskHistories.forEach(history => {
            this.taskHistories.set(history.type, history);
          });
        },
        error: (error) => {
          console.error('Error loading tasks:', error);
          this.showMessage('error', 'settings.taskManagement.toast.loadError.summary', 'settings.taskManagement.toast.loadError.detail');
        }
      });
  }

  private subscribeToTaskProgress(): void {
    this.subscription = this.taskService.taskProgress$.subscribe(progress => {
      if (progress) {
        this.updateTaskWithProgress(progress);
      }
    });
  }

  private updateTaskWithProgress(progress: TaskProgressPayload): void {
    const existingHistory = this.taskHistories.get(progress.taskType);

    const updatedHistory: TaskHistory = {
      id: progress.taskId,
      type: progress.taskType,
      status: progress.taskStatus,
      progressPercentage: progress.progress,
      message: progress.message,
      createdAt: existingHistory?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: (progress.taskStatus === TaskStatus.COMPLETED || progress.taskStatus === TaskStatus.FAILED)
        ? new Date().toISOString()
        : existingHistory?.completedAt || null
    };

    this.taskHistories.set(progress.taskType, updatedHistory);

    if (progress.taskStatus === TaskStatus.COMPLETED || progress.taskStatus === TaskStatus.FAILED) {
      setTimeout(() => this.loadTasks(), 1000);
    }
  }

  private sortTasksByDisplayOrder(tasks: TaskInfo[]): TaskInfo[] {
    return tasks.sort((a, b) => {
      const orderA = TASK_TYPE_CONFIG[a.taskType as TaskType]?.displayOrder ?? 999;
      const orderB = TASK_TYPE_CONFIG[b.taskType as TaskType]?.displayOrder ?? 999;
      return orderA - orderB;
    });
  }

  // ============================================================================
  // Task Execution Operations
  // ============================================================================

  canExecuteTask(taskType: string): boolean {
    const history = this.taskHistories.get(taskType);
    return this.canRunTask(history) || this.isTaskStale(history);
  }

  executeTask(taskType: string): void {
    this.runTask(taskType);
  }

  runTask(type: string): void {
    const history = this.taskHistories.get(type);
    if (!this.canRunTask(history) && !this.isTaskStale(history)) {
      this.showMessage('warn', 'settings.taskManagement.toast.alreadyRunning.summary', 'settings.taskManagement.toast.alreadyRunning.detail');
      return;
    }

    let options = null;

    if (type === TaskType.REFRESH_LIBRARY_METADATA) {
      options = {
        metadataReplaceMode: this.selectedMetadataReplaceMode
      };
    }

    this.runTaskWithOptions(type, options);
  }

  private runTaskWithOptions(type: string, options: LibraryRescanOptions | MetadataRefreshRequest | null): void {
    const request: TaskCreateRequest = {
      taskType: type as TaskType,
      options: options
    };

    const isAsync = TASK_TYPE_CONFIG[type as TaskType]?.async || false;

    this.executingTasks.add(type);
    this.taskService.startTask(request)
      .pipe(finalize(() => this.executingTasks.delete(type)))
      .subscribe({
        next: (response) => {
          if (isAsync) {
            this.showMessage(
              'info',
              'settings.taskManagement.toast.taskQueued.summary',
              'settings.taskManagement.toast.taskQueued.detail',
              {taskName: this.getTaskDisplayName(type)}
            );
          } else {
            if (response.status === TaskStatus.COMPLETED) {
              this.showMessage(
                'success',
                'settings.taskManagement.toast.taskCompleted.summary',
                'settings.taskManagement.toast.taskCompleted.detail',
                {taskName: this.getTaskDisplayName(type)}
              );
            } else if (response.status === TaskStatus.FAILED) {
              if (response.message) {
                this.showMessage('error', 'settings.taskManagement.toast.taskFailed.summary', response.message, undefined, false);
              } else {
                this.showMessage(
                  'error',
                  'settings.taskManagement.toast.taskFailed.summary',
                  'settings.taskManagement.toast.taskFailed.detail',
                  {taskName: this.getTaskDisplayName(type)}
                );
              }
            } else {
              this.showMessage(
                'success',
                'settings.taskManagement.toast.taskStarted.summary',
                'settings.taskManagement.toast.taskStarted.detail',
                {taskName: this.getTaskDisplayName(type)}
              );
            }
          }
          this.loadTasks();
        },
        error: (error) => {
          console.error('Error starting task:', error);
          this.showMessage(
            'error',
            'settings.taskManagement.toast.startError.summary',
            'settings.taskManagement.toast.startError.detail',
            {taskName: this.getTaskDisplayName(type)}
          );
        }
      });
  }

  cancelTask(taskType: string): void {
    const history = this.taskHistories.get(taskType);
    if (!history?.id) {
      this.showMessage('error', 'settings.taskManagement.toast.cancelMissingId.summary', 'settings.taskManagement.toast.cancelMissingId.detail');
      return;
    }

    this.executingTasks.add(taskType);
    this.taskService.cancelTask(history.id)
      .pipe(finalize(() => this.executingTasks.delete(taskType)))
      .subscribe({
        next: (response) => {
          if (response.cancelled) {
            if (response.message) {
              this.showMessage('success', 'settings.taskManagement.toast.taskCancelled.summary', response.message, undefined, false);
            } else {
              this.showMessage('success', 'settings.taskManagement.toast.taskCancelled.summary', 'settings.taskManagement.toast.taskCancelled.detail');
            }
            this.loadTasks();
          } else {
            if (response.message) {
              this.showMessage('error', 'settings.taskManagement.toast.cancelFailed.summary', response.message, undefined, false);
            } else {
              this.showMessage('error', 'settings.taskManagement.toast.cancelFailed.summary', 'settings.taskManagement.toast.cancelFailed.detail');
            }
          }
        },
        error: (error) => {
          console.error('Error cancelling task:', error);
          this.showMessage('error', 'settings.taskManagement.toast.cancelError.summary', 'settings.taskManagement.toast.cancelError.detail');
          this.loadTasks();
        }
      });
  }

  canRunTask(history: TaskHistory | undefined): boolean {
    return !history?.status || history.status === TaskStatus.COMPLETED || history.status === TaskStatus.FAILED || history.status === TaskStatus.CANCELLED;
  }

  canCancelTask(history: TaskHistory | undefined): boolean {
    return history?.status === TaskStatus.IN_PROGRESS || history?.status === TaskStatus.PENDING;
  }

  isTaskExecuting(taskType: string): boolean {
    return this.executingTasks.has(taskType);
  }

  isTaskRunning(taskType: string): boolean {
    const history = this.taskHistories.get(taskType);
    return history?.status === TaskStatus.IN_PROGRESS || history?.status === TaskStatus.PENDING;
  }

  isTaskStale(history: TaskHistory | undefined): boolean {
    if (!history || !this.isTaskRunningForHistory(history) || !history.updatedAt) {
      return false;
    }
    const lastUpdate = new Date(history.updatedAt).getTime();
    const now = Date.now();
    return (now - lastUpdate) > this.STALE_TASK_THRESHOLD_MS;
  }

  private isTaskRunningForHistory(history: TaskHistory): boolean {
    return history.status === TaskStatus.IN_PROGRESS || history.status === TaskStatus.PENDING;
  }

  // ============================================================================
  // Cron Configuration Management
  // ============================================================================

  isCronSupported(taskType: string): boolean {
    const taskInfo = this.taskInfos.find(t => t.taskType === taskType);
    return taskInfo?.cronSupported || false;
  }

  getCronConfig(taskType: string): { enabled?: boolean; cronExpression?: string } | null | undefined {
    const taskInfo = this.taskInfos.find(t => t.taskType === taskType);
    if (!taskInfo?.cronConfig) return null;

    const cronConfig = taskInfo.cronConfig;
    return {
      enabled: cronConfig.enabled,
      cronExpression: cronConfig.cronExpression ?? undefined
    };
  }

  toggleCronEnabled(taskType: string): void {
    const cronConfig = this.getCronConfig(taskType);
    if (!cronConfig) return;

    const request: TaskCronConfigRequest = {
      enabled: !(cronConfig.enabled ?? false)
    };

    this.updateCronConfig(taskType, request);
  }

  isEditingCron(taskType: string): boolean {
    return this.editingCronTaskType === taskType;
  }

  startEditingCron(taskType: string): void {
    const cronConfig = this.getCronConfig(taskType);
    this.editingCronTaskType = taskType;
    this.editingCronExpression = cronConfig?.cronExpression || '';
    this.cronValidationError = null;
    this.validateCronExpression(this.editingCronExpression);
  }

  cancelEditingCron(): void {
    this.editingCronTaskType = null;
    this.editingCronExpression = '';
    this.cronValidationError = null;
  }

  onCronExpressionChange(): void {
    this.validateCronExpression(this.editingCronExpression);
  }

  saveCronExpression(taskType: string): void {
    if (this.cronValidationError) {
      return;
    }

    const expression = this.editingCronExpression.trim() || null;
    this.updateCronExpression(taskType, expression);
    this.cancelEditingCron();
  }

  updateCronExpression(taskType: string, expression: string | null): void {
    const request: TaskCronConfigRequest = {
      cronExpression: expression
    };

    this.updateCronConfig(taskType, request);
  }

  private updateCronConfig(taskType: string, request: TaskCronConfigRequest): void {
    this.cronUpdating = true;
    this.taskService.updateCronConfig(taskType, request)
      .pipe(finalize(() => this.cronUpdating = false))
      .subscribe({
        next: (updatedConfig) => {
          const taskInfoIndex = this.taskInfos.findIndex(t => t.taskType === taskType);
          if (taskInfoIndex !== -1) {
            this.taskInfos[taskInfoIndex].cronConfig = updatedConfig;
          }
          this.showMessage('success', 'settings.taskManagement.toast.cronUpdated.summary', 'settings.taskManagement.toast.cronUpdated.detail');
        },
        error: (error) => {
          console.error('Error updating cron config:', error);
          this.showMessage('error', 'settings.taskManagement.toast.cronUpdateFailed.summary', 'settings.taskManagement.toast.cronUpdateFailed.detail');
        }
      });
  }

  // ============================================================================
  // Cron Validation
  // ============================================================================

  private validateCronExpression(expression: string): void {
    if (!expression || expression.trim() === '') {
      this.cronValidationError = null;
      return;
    }

    const trimmed = expression.trim();
    const parts = trimmed.split(/\s+/);

    if (parts.length !== 6) {
      this.cronValidationError = this.translateService.instant('settings.taskManagement.cron.validation.fieldCount');
      return;
    }

    const validations = [
      {field: parts[0], nameKey: 'settings.taskManagement.cron.field.seconds', range: [0, 59]},
      {field: parts[1], nameKey: 'settings.taskManagement.cron.field.minutes', range: [0, 59]},
      {field: parts[2], nameKey: 'settings.taskManagement.cron.field.hours', range: [0, 23]},
      {field: parts[3], nameKey: 'settings.taskManagement.cron.field.dayOfMonth', range: [1, 31]},
      {field: parts[4], nameKey: 'settings.taskManagement.cron.field.month', range: [1, 12]},
      {field: parts[5], nameKey: 'settings.taskManagement.cron.field.dayOfWeek', range: [0, 7]}
    ];

    for (const validation of validations) {
      if (!this.isValidCronField(validation.field, validation.range[0], validation.range[1])) {
        this.cronValidationError = this.translateService.instant('settings.taskManagement.cron.validation.invalidField', {
          fieldName: this.translateService.instant(validation.nameKey),
          fieldValue: validation.field
        });
        return;
      }
    }

    this.cronValidationError = null;
  }

  private isValidCronField(field: string, min: number, max: number): boolean {
    if (field === '*' || field === '?') {
      return true;
    }

    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number);
      return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
    }

    if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepNum = Number(step);
      if (isNaN(stepNum) || stepNum <= 0) return false;

      if (range === '*') return true;
      if (range.includes('-')) {
        const [start, end] = range.split('-').map(Number);
        return !isNaN(start) && !isNaN(end) && start >= min && end <= max;
      }
      return false;
    }

    if (field.includes(',')) {
      const values = field.split(',').map(Number);
      return values.every(val => !isNaN(val) && val >= min && val <= max);
    }

    const num = Number(field);
    return !isNaN(num) && num >= min && num <= max;
  }

  // ============================================================================
  // UI Helper Methods - Task Information
  // ============================================================================

  private translateOrFallback(key: string, fallback: string): string {
    const translated = this.translateService.instant(key);
    return translated === key ? fallback : translated;
  }

  private getI18nTaskTypeKey(taskType: string): string {
    return taskType
      .toLowerCase()
      .replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  }

  getTaskDisplayName(type: string): string {
    const taskInfo = this.taskInfos.find(t => t.taskType === type);
    const fallback = taskInfo?.name || type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    return this.translateOrFallback(`settings.taskManagement.taskType.${this.getI18nTaskTypeKey(type)}.name`, fallback);
  }

  getTaskDescription(type: string): string {
    const taskInfo = this.taskInfos.find(t => t.taskType === type);
    const fallback = taskInfo?.description || this.translateService.instant('settings.taskManagement.task.defaultDescription');
    return this.translateOrFallback(`settings.taskManagement.taskType.${this.getI18nTaskTypeKey(type)}.description`, fallback);
  }

  getTaskDisplayOrder(type: string): number {
    return TASK_TYPE_CONFIG[type as TaskType]?.displayOrder ?? 999;
  }

  getTaskLabel(taskType: string): string {
    return `${this.getTaskDisplayOrder(taskType)}. ${this.getTaskDisplayName(taskType)}`;
  }

  getTaskIcon(taskType: string): string {
    const icons: Record<string, string> = {
      [TaskType.CLEAR_PDF_CACHE]: 'pi-database',
      [TaskType.REFRESH_LIBRARY_METADATA]: 'pi-refresh',
      [TaskType.UPDATE_BOOK_RECOMMENDATIONS]: 'pi-sparkles',
      [TaskType.CLEANUP_DELETED_BOOKS]: 'pi-trash',
      [TaskType.SYNC_LIBRARY_FILES]: 'pi-sync',
      [TaskType.CLEANUP_TEMP_METADATA]: 'pi-file'
    };
    return icons[taskType] || 'pi-cog';
  }

  getTaskMetadata(taskType: string): string | null {
    const taskInfo = this.taskInfos.find(t => t.taskType === taskType);
    return taskInfo?.metadata || null;
  }

  hasMetadata(taskType: string): boolean {
    const taskInfo = this.taskInfos.find(t => t.taskType === taskType);
    return !!taskInfo?.metadata && taskInfo.metadata.trim().length > 0;
  }

  getMetadataIcon(taskType: string): string {
    const icons: Record<string, string> = {
      [TaskType.CLEAR_PDF_CACHE]: 'pi-database',
      [TaskType.CLEANUP_DELETED_BOOKS]: 'pi-trash',
      [TaskType.CLEANUP_TEMP_METADATA]: 'pi-file'
    };
    return icons[taskType] || 'pi-info-circle';
  }

  // ============================================================================
  // UI Helper Methods - Task History & Status
  // ============================================================================

  getTaskHistory(taskType: string): TaskHistory | undefined {
    return this.taskHistories.get(taskType);
  }

  getTaskProgressPercentage(taskType: string): number | null {
    return this.taskHistories.get(taskType)?.progressPercentage || null;
  }

  getTaskUpdatedAt(taskType: string): string | null {
    return this.taskHistories.get(taskType)?.updatedAt || null;
  }

  getTaskStatusMessage(taskType: string): string {
    const history = this.taskHistories.get(taskType);
    if (this.isTaskStale(history)) {
      return this.translateService.instant('settings.taskManagement.statusMessage.stuck');
    }
    return history?.message || this.translateService.instant('settings.taskManagement.statusMessage.processing');
  }

  getLastRunMessage(taskType: string): string {
    const history = this.taskHistories.get(taskType);
    if (!history?.completedAt && !history?.updatedAt) {
      return this.translateService.instant('settings.taskManagement.lastRun.never');
    }

    const dateStr = history.completedAt || history.updatedAt;
    if (!dateStr) return this.translateService.instant('settings.taskManagement.lastRun.never');

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return this.translateService.instant('settings.taskManagement.lastRun.justNow');
    if (diffMins < 60) return this.translateService.instant('settings.taskManagement.lastRun.minutesAgo', {minutes: diffMins});
    if (diffHours < 24) return this.translateService.instant('settings.taskManagement.lastRun.hoursAgo', {hours: diffHours});
    if (diffDays < 7) return this.translateService.instant('settings.taskManagement.lastRun.daysAgo', {days: diffDays});

    return date.toLocaleDateString();
  }

  getLastRunInfoClass(taskType: string): string {
    const history = this.taskHistories.get(taskType);
    if (!history?.status) return 'info';

    switch (history.status) {
      case TaskStatus.COMPLETED:
        return 'success';
      case TaskStatus.FAILED:
        return 'error';
      case TaskStatus.CANCELLED:
        return 'warning';
      default:
        return 'info';
    }
  }

  // ============================================================================
  // UI Helper Methods - Buttons & Icons
  // ============================================================================

  getTaskButtonIcon(taskType: string): string {
    if (this.isTaskExecuting(taskType)) {
      return 'pi pi-spinner pi-spin';
    }
    return 'pi ' + this.getTaskIcon(taskType);
  }

  getTaskButtonLabel(taskType: string): string {
    const history = this.taskHistories.get(taskType);
    if (this.isTaskStale(history)) {
      return this.translateService.instant('settings.taskManagement.action.rerun');
    }
    return this.translateService.instant('settings.taskManagement.action.run');
  }

  getCancelButtonIcon(taskType: string): string {
    if (this.isTaskExecuting(taskType)) {
      return 'pi pi-spinner pi-spin';
    }
    return 'pi pi-times';
  }

  // ============================================================================
  // UI Helper Methods - Metadata Replace
  // ============================================================================

  getMetadataReplaceDescription(mode: MetadataReplaceMode): string {
    switch (mode) {
      case MetadataReplaceMode.REPLACE_MISSING:
        return this.translateService.instant('settings.taskManagement.metadataReplace.description.replaceMissing');
      case MetadataReplaceMode.REPLACE_ALL:
        return this.translateService.instant('settings.taskManagement.metadataReplace.description.replaceAll');
      default:
        return '';
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  private refreshMetadataReplaceOptions(): void {
    this.metadataReplaceOptions = [
      {
        label: this.translateService.instant('settings.taskManagement.metadataReplace.option.replaceMissing'),
        value: MetadataReplaceMode.REPLACE_MISSING
      },
      {
        label: this.translateService.instant('settings.taskManagement.metadataReplace.option.replaceAll'),
        value: MetadataReplaceMode.REPLACE_ALL
      }
    ];
  }

  private showMessage(
    severity: 'success' | 'info' | 'warn' | 'error',
    summaryKey: string,
    detailKeyOrText: string,
    params?: Record<string, unknown>,
    translateDetail: boolean = true
  ): void {
    this.messageService.add({
      severity,
      summary: this.translateService.instant(summaryKey, params),
      detail: translateDetail ? this.translateService.instant(detailKeyOrText, params) : detailKeyOrText
    });
  }
}
