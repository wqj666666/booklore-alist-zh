# Booklore-AList-ZH

<div align="center">

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Angular](https://img.shields.io/badge/Angular-21.x-red.svg)](https://angular.io/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-green.svg)](https://spring.io/projects/spring-boot)

基于 [Booklore](https://github.com/booklore-app/booklore) 的中文优化版本，支持 AList 存储后端

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [部署指南](#-部署指南) • [贡献指南](#-贡献指南) • [许可证](#-许可证)

</div>

---

## 📖 关于本项目

**Booklore-AList-ZH** 是 [Booklore](https://github.com/booklore-app/booklore) 的派生项目，专为中文用户优化，并扩展了 AList 存储支持。

### 与原项目的关系

本项目基于 Booklore 开源项目开发，遵循 GPL-3.0 许可证。我们在原项目的基础上进行了以下改进：

- ✅ **完整的中英文国际化** - 所有 UI 界面支持中英文切换
- ✅ **AList 存储集成** - 支持使用 AList 作为存储后端
- ✅ **默认本地存储** - 保留原有本地存储功能，可自由选择

**原项目**: https://github.com/booklore-app/booklore

---

## 🌟 功能特性

### 核心功能（继承自原项目）

- 📚 **数字图书馆管理** - 管理和组织您的电子书和漫画收藏
- 📖 **多格式阅读器** - 支持 EPUB、PDF、CBZ、CBR 等格式
- 🔍 **智能元数据获取** - 自动从多个来源获取书籍信息
- 📊 **阅读统计** - 追踪您的阅读习惯和进度
- 🔐 **隐私优先** - 自托管，完全控制您的数据
- 🎨 **现代化界面** - 基于 Angular 21 和 PrimeNG 的优雅 UI

### 本版本新增特性

#### 1. 完整的中英文国际化支持

- ✨ **运行时语言切换** - 无需重启，即时切换界面语言
- 🌏 **全面覆盖** - 包括菜单、设置、阅读器、统计等所有模块
- 🔄 **持久化语言偏好** - 自动保存并恢复您的语言选择
- 📝 **中文优化** - 针对中文用户的使用习惯进行了细致优化

#### 2. AList 存储后端支持

- ☁️ **灵活存储选择** - 支持本地存储和 AList 云存储
- 🔗 **AList 集成** - 无缝对接 AList 文件管理系统
- 💾 **混合存储** - 不同书库可以使用不同的存储后端
- ⚙️ **便捷配置** - 在设置页面轻松配置 AList 连接

---

## 🚀 快速开始

### 使用 Docker（推荐）

最简单的部署方式是使用 Docker Compose：

```bash
# 克隆仓库
git clone https://github.com/wqj666666/booklore-alist-zh.git
cd booklore-alist-zh

# 启动服务
docker compose up -d
```

访问 `http://localhost:8080` 开始使用！

### 手动部署

#### 前置要求

- **Java 21+** - [下载地址](https://adoptium.net/)
- **Node.js 18+** - [下载地址](https://nodejs.org/)
- **MariaDB 10.6+** - [下载地址](https://mariadb.org/download/)

#### 后端部署

```bash
cd booklore-api

# 配置数据库连接（编辑 application.yml）
# 详见部署指南

# 启动后端
./gradlew bootRun
```

#### 前端部署

```bash
cd booklore-ui

# 安装依赖
npm install

# 启动开发服务器
npm start

# 或构建生产版本
npm run build
```

---

## 📦 部署指南

### Docker 部署

提供了完整的 Docker Compose 配置：

```yaml
# docker-compose.yml
services:
  booklore:
    # Docker Hub 官方镜像
    image: pual666666/booklore-alist-zh:latest
    container_name: booklore
    environment:
      - USER_ID=0
      - GROUP_ID=0
      - TZ=Asia/Shanghai  # 时区设置
      
      # 数据库配置（请根据实际情况修改）
      # 如果 MariaDB 是 Docker 容器且在同一网络，填写容器名
      # 如果 MariaDB 在宿主机或其他服务器，填写 IP 地址
      - DATABASE_URL=jdbc:mariadb://your-database-host:3306/booklore
      - DATABASE_USERNAME=root
      - DATABASE_PASSWORD=your_secure_password
      
      - BOOKLORE_PORT=6060
      - SWAGGER_ENABLED=false
      - FORCE_DISABLE_OIDC=false
    ports:
      - "6060:6060"
    volumes:
      - ./data:/app/data      # 应用数据
      - ./books:/books        # 书籍存储
      - ./bookdrop:/bookdrop  # 书籍上传临时目录
    healthcheck:
      test: wget -q -O - http://localhost:6060/api/v1/healthcheck
      interval: 60s
      retries: 5
      start_period: 60s
      timeout: 10s
    restart: unless-stopped
```

**部署步骤**：

1. 创建 `docker-compose.yml` 文件，复制上面的配置
2. 修改环境变量中的数据库连接信息
3. 运行 `docker compose up -d` 启动服务
4. 访问 `http://localhost:6060` 开始使用

**注意事项**：
- 首次启动需要创建管理员账户
- 确保数据库已创建 `booklore` 数据库
- 建议修改默认密码

### AList 存储配置

1. 在设置页面选择 **存储设置** 标签
2. 配置 AList 服务器地址和认证信息
3. 测试连接确保配置正确
4. 在创建书库时选择 AList 作为存储后端

详细配置说明请参考 [部署文档](https://github.com/wqj666666/booklore-alist-zh/wiki)。

---

## 🔧 技术栈

### 前端
- **框架**: Angular 21 (Standalone Components)
- **UI 库**: PrimeNG 21
- **国际化**: @ngx-translate/core
- **样式**: TailwindCSS + SCSS
- **测试**: Vitest

### 后端
- **框架**: Spring Boot 3.5
- **语言**: Java 21
- **数据库**: MariaDB
- **认证**: JWT + OIDC (可选)
- **API**: RESTful + WebSocket

---

## 📝 主要改进内容

### UI 国际化实现

- ✅ 引入 ngx-translate 实现运行时翻译
- ✅ 建立完整的中英文语言资源文件
- ✅ 实现 LanguageService 管理语言状态和持久化
- ✅ 覆盖所有页面、组件、菜单、提示信息
- ✅ 同步 PrimeNG 组件的内置文案
- ✅ 优化日期、数字格式化的本地化

### AList 存储集成

- ✅ 扩展 LibraryPath 数据模型支持存储类型
- ✅ 新增 AList 配置管理界面
- ✅ 实现 AList API 客户端
- ✅ 支持混合存储策略（本地 + AList）
- ✅ 提供连接测试和状态监控



## 🙏 致谢

### 原项目

本项目基于 [Booklore](https://github.com/booklore-app/booklore) 开发，感谢 Booklore 团队的卓越工作！

**原项目作者**: Booklore Contributors  
**原项目地址**: https://github.com/booklore-app/booklore  
**原项目许可证**: GPL-3.0

### 特别感谢

- [AList](https://alist.nn.ci/) - 优秀的文件列表程序
- [PrimeNG](https://primeng.org/) - 强大的 Angular UI 组件库
- 所有为本项目做出贡献的开发者

---

## 📄 许可证

本项目继承原项目的 **GPL-3.0 许可证**。

```
Booklore-AList-ZH
Copyright (C) 2026 wqj666666

This program is a modified version of Booklore
Original Copyright (C) 2024 Booklore Contributors
Original project: https://github.com/booklore-app/booklore

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
```

详见 [LICENSE](./LICENSE) 文件。


## 🗺️ 路线图

- [ ] 完善 AList 存储功能
- [ ] 优化中文搜索体验
- [ ] 支持更多存储后端
- [ ] 移动端优化
- [ ] 添加更多语言支持

