# 更新日志 / Changelog

本文档记录 Booklore-AList-ZH 项目的所有重要更改。

---

## [1.0.0] - 2026-01-23

### 🎉 首个公开版本

基于 Booklore 原项目进行二次开发，主要改进中文支持和 AList 存储集成。

### ✨ 新增功能

#### 国际化支持
- **完整的中英文 UI 国际化**
  - 引入 ngx-translate 实现运行时翻译框架
  - 建立完整的中文（zh-CN）和英文（en）语言资源文件
  - 实现 LanguageService 管理语言状态、持久化和广播
  - 在顶栏添加语言切换入口（桌面端下拉 + 移动端菜单）
  - 默认语言设置为简体中文

- **全面覆盖的国际化模块**
  - ✅ 顶栏与侧边栏导航菜单
  - ✅ 书籍浏览器（Book Browser）- 筛选、排序、表格、卡片视图
  - ✅ 元数据管理（Metadata）- 查看器、编辑器、搜索器、批量更新
  - ✅ 设置页面（Settings）- 所有 11 个设置标签页
  - ✅ 阅读器（Readers）- EPUB、PDF、CBX 阅读器及其设置
  - ✅ 统计页面（Stats）- 用户统计和图书馆统计
  - ✅ Bookdrop 文件管理 - 审查、元数据选择、批量编辑
  - ✅ 仪表盘（Dashboard）- 首页和书籍滚动展示
  - ✅ 认证相关页面 - 登录、设置、密码修改
  - ✅ 所有对话框、提示信息、Tooltip 和 aria-label

- **国际化技术实现**
  - 同步 PrimeNG 组件内置文案（日期选择器、分页器、表格筛选等）
  - 实现日期和数字格式的本地化
  - 支持语言切换后即时更新，无需刷新页面
  - 语言偏好持久化到 localStorage
  - 自动同步 `<html lang>` 属性以支持可访问性

#### AList 存储集成
- **AList 存储后端支持**
  - 扩展 LibraryPath 数据模型，新增 `alistEnabled` 和 `alistPath` 字段
  - 在书库创建流程中支持选择存储类型（本地 / AList）
  - 新增 AList 路径配置输入框和验证
  - 支持混合存储策略（不同书库可使用不同存储后端）

- **AList 配置管理**
  - 新增 Settings「Storage Settings」标签页
  - 实现 AList 服务器连接配置界面
  - 提供 AList 连接测试功能
  - 显示当前存储类型状态（本地 / AList）
  - 支持 AList 服务器地址、端口、认证信息配置

### 🔧 技术改进

- **代码质量**
  - 新增 i18n 资源一致性检查脚本（`npm run i18n:check`）
  - 校验中英文语言文件 key 结构完全一致
  - 校验 key 命名规范（小驼峰格式）
  - 调整 ESLint 配置，清理历史遗留 lint 错误
  - 所有测试通过（Vitest 单元测试）

- **开发体验**
  - 建立 memory-bank 文档系统，记录架构和实施计划
  - 完善的进度跟踪文档（progress.md）
  - 统一的翻译 key 命名规范和组织结构
  - 完整的类型定义和接口扩展

### 📝 文档

- 新增完整的 README.md（中文版）
- 新增 CHANGELOG.md 记录版本变更
- 新增 LICENSE 文件（GPL-3.0）
- 新增实施计划文档（implementation-plan-ui-i18n-zh-en.md）
- 新增架构文档（architecture.md）

### 🐛 Bug 修复

- 修复 ReadStatusHelper 缺失 UNREAD/UNSET 状态的 label key
- 修复 settings i18n 资源重复 key 导致的文案覆盖问题
- 修复 Dashboard scroller 存储翻译后文案导致语言切换失效
- 修复 BookFilter 标题显示原始 key 的问题
- 修复 Metadata Center 对话框标题未国际化的问题

### 📦 依赖更新

- Angular 21.0.8
- PrimeNG 21.0.2
- @ngx-translate/core 17.0.0
- @ngx-translate/http-loader 17.0.0

### 🔗 基于原项目

- **原项目**: [Booklore](https://github.com/booklore-app/booklore)
- **原项目许可证**: GPL-3.0
- **基于版本**: Booklore v1.x.x
- **主要修改**:
  - 前端 UI 完整国际化（中文/英文）
  - 添加 AList 存储后端支持
  - 优化中文用户体验
  - 扩展存储配置管理

### ⚠️ 已知限制

- 部分第三方阅读器控件内部文案暂不可配置
- 后端返回的错误信息暂未完全国际化（显示原文）
- AList 存储功能仍在持续优化中

### 🙏 致谢

感谢 [Booklore](https://github.com/booklore-app/booklore) 原项目团队的出色工作！

---

## 版本说明

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

版本号格式：`主版本号.次版本号.修订号`

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

---

## 计划功能

### v1.1.0（计划中）
- [ ] 完善 AList 存储功能
- [ ] 优化中文搜索和分词
- [ ] 支持后端错误信息国际化
- [ ] 添加更多语言支持（繁体中文、日文等）

### v1.2.0（计划中）
- [ ] 支持更多云存储后端（WebDAV、S3 等）
- [ ] 移动端 UI 优化

## 许可证

本项目继承原项目的 GPL-3.0 许可证。详见 [LICENSE](./LICENSE) 文件。