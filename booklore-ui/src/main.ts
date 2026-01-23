import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {DialogService} from 'primeng/dynamicdialog';
import {ConfirmationService, MessageService} from 'primeng/api';
import {RxStompService} from './app/shared/websocket/rx-stomp.service';
import {rxStompServiceFactory} from './app/shared/websocket/rx-stomp-service-factory';
import {provideRouter, RouteReuseStrategy} from '@angular/router';
import {CustomReuseStrategy} from './app/core/custom-reuse-strategy';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {PrimeNG, providePrimeNG} from 'primeng/config';
import {bootstrapApplication} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import Aura from '@primeng/themes/aura';
import {routes} from './app/app.routes';
import {AuthInterceptorService} from './app/core/security/auth-interceptor.service';
import {AuthService, websocketInitializer} from './app/shared/service/auth.service';
import {OAuthStorage, provideOAuthClient} from 'angular-oauth2-oidc';
import {inject, provideAppInitializer, provideZoneChangeDetection} from '@angular/core';
import {initializeAuthFactory} from './app/core/security/auth-initializer';
import {StartupService} from './app/shared/service/startup.service';
import {provideCharts, withDefaultRegisterables} from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {LanguageService} from './app/core/i18n/language.service';
import {DEFAULT_LANGUAGE, SupportedLanguage} from './app/core/i18n/language';
import {provideTranslateService, TranslateService} from '@ngx-translate/core';
import {provideTranslateHttpLoader} from '@ngx-translate/http-loader';

export function storageFactory(): OAuthStorage {
  return localStorage;
}

function getPrimeNgTranslation(language: SupportedLanguage) {
  if (language === 'zh-CN') {
    return {
      startsWith: '以...开始',
      contains: '包含',
      notContains: '不包含',
      endsWith: '以...结束',
      equals: '等于',
      notEquals: '不等于',
      noFilter: '无筛选',
      lt: '小于',
      lte: '小于等于',
      gt: '大于',
      gte: '大于等于',
      is: '是',
      isNot: '不是',
      before: '之前',
      after: '之后',
      dateIs: '日期是',
      dateIsNot: '日期不是',
      dateBefore: '日期早于',
      dateAfter: '日期晚于',
      clear: '清除',
      apply: '应用',
      matchAll: '全部匹配',
      matchAny: '任意匹配',
      addRule: '添加规则',
      removeRule: '移除规则',
      accept: '确定',
      reject: '取消',
      choose: '选择',
      upload: '上传',
      cancel: '取消',
      dayNames: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
      dayNamesShort: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      dayNamesMin: ['日', '一', '二', '三', '四', '五', '六'],
      monthNames: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
      monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      today: '今天',
      weekHeader: '周',
      firstDayOfWeek: 1,
      dateFormat: 'yy-mm-dd',
      weak: '弱',
      medium: '中等',
      strong: '强',
      passwordPrompt: '请输入密码',
      emptyFilterMessage: '无匹配结果',
      emptyMessage: '暂无数据',
      aria: {
        trueLabel: '是',
        falseLabel: '否',
        nullLabel: '未选择',
        star: '星',
        stars: '星',
        selectAll: '全选',
        unselectAll: '取消全选',
        close: '关闭',
        previous: '上一步',
        next: '下一步',
        navigation: '导航',
        scrollTop: '回到顶部',
        moveTop: '置顶',
        moveUp: '上移',
        moveDown: '下移',
        moveBottom: '置底',
        moveToTarget: '移到目标',
        moveToSource: '移到来源',
        moveAllToTarget: '全部移到目标',
        moveAllToSource: '全部移到来源',
        pageLabel: '第 {page} 页',
        firstPageLabel: '首页',
        lastPageLabel: '末页',
        nextPageLabel: '下一页',
        prevPageLabel: '上一页'
      }
    };
  }

  return {
    startsWith: 'Starts with',
    contains: 'Contains',
    notContains: 'Not contains',
    endsWith: 'Ends with',
    equals: 'Equals',
    notEquals: 'Not equals',
    noFilter: 'No Filter',
    lt: 'Less than',
    lte: 'Less than or equal to',
    gt: 'Greater than',
    gte: 'Greater than or equal to',
    is: 'Is',
    isNot: 'Is not',
    before: 'Before',
    after: 'After',
    dateIs: 'Date is',
    dateIsNot: 'Date is not',
    dateBefore: 'Date is before',
    dateAfter: 'Date is after',
    clear: 'Clear',
    apply: 'Apply',
    matchAll: 'Match All',
    matchAny: 'Match Any',
    addRule: 'Add Rule',
    removeRule: 'Remove Rule',
    accept: 'OK',
    reject: 'Cancel',
    choose: 'Choose',
    upload: 'Upload',
    cancel: 'Cancel',
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    dayNamesMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    today: 'Today',
    weekHeader: 'Wk',
    firstDayOfWeek: 0,
    dateFormat: 'yy-mm-dd',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    passwordPrompt: 'Enter a password',
    emptyFilterMessage: 'No results found',
    emptyMessage: 'No available options',
    aria: {
      trueLabel: 'True',
      falseLabel: 'False',
      nullLabel: 'Not selected',
      star: 'star',
      stars: 'stars',
      selectAll: 'Select All',
      unselectAll: 'Unselect All',
      close: 'Close',
      previous: 'Previous',
      next: 'Next',
      navigation: 'Navigation',
      scrollTop: 'Scroll Top',
      moveTop: 'Move Top',
      moveUp: 'Move Up',
      moveDown: 'Move Down',
      moveBottom: 'Move Bottom',
      moveToTarget: 'Move to Target',
      moveToSource: 'Move to Source',
      moveAllToTarget: 'Move All to Target',
      moveAllToSource: 'Move All to Source',
      pageLabel: 'Page {page}',
      firstPageLabel: 'First Page',
      lastPageLabel: 'Last Page',
      nextPageLabel: 'Next Page',
      prevPageLabel: 'Previous Page'
    }
  };
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideCharts(withDefaultRegisterables(), ChartDataLabels),
    provideAppInitializer(() => {
      const languageService = inject(LanguageService);
      languageService.initInitialLanguage();
      return Promise.resolve();
    }),
    provideAppInitializer(() => {
      const languageService = inject(LanguageService);
      const translate = inject(TranslateService);
      translate.setFallbackLang('en');
      translate.use(languageService.getCurrentLanguage());
      languageService.language$.subscribe(lang => translate.use(lang));
      return Promise.resolve();
    }),
    provideAppInitializer(() => {
      const languageService = inject(LanguageService);
      const primeng = inject(PrimeNG);
      const applyTranslation = (lang: SupportedLanguage) => primeng.setTranslation(getPrimeNgTranslation(lang));
      applyTranslation(languageService.getCurrentLanguage());
      languageService.language$.subscribe(applyTranslation);
      return Promise.resolve();
    }),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return websocketInitializer(authService)();
    }),
    provideAppInitializer(() => {
      const startup = inject(StartupService);
      return startup.load();
    }),
    provideHttpClient(withInterceptors([AuthInterceptorService])),
    provideOAuthClient(),
    {
      provide: OAuthStorage,
      useFactory: storageFactory
    },
    provideAppInitializer(initializeAuthFactory()),
    provideRouter(routes),
    DialogService,
    MessageService,
    ConfirmationService,
    {
      provide: RxStompService,
      useFactory: rxStompServiceFactory,
      deps: [AuthService],
    },
    {
      provide: RouteReuseStrategy,
      useClass: CustomReuseStrategy
    },
    provideAnimationsAsync(),
    provideTranslateService({
      fallbackLang: 'en',
      lang: DEFAULT_LANGUAGE,
      loader: provideTranslateHttpLoader({
        prefix: 'assets/i18n/',
        suffix: '.json'
      })
    }),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.p-dark'
        }
      }
    })
  ]
}).catch(err => console.error(err));
