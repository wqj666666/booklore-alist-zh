# 架构概览（基于模块依赖与包结构）

## 模块依赖（部署/容器视角）

```mermaid
flowchart LR
  subgraph Browser["浏览器"]
    UI["BookLore UI（Angular）"]
  end

  subgraph Container["单容器（Dockerfile 组合构建）"]
    Nginx["Nginx（静态资源 + 反向代理）"]
    API["BookLore API（Spring Boot）"]
  end

  DB["MariaDB（JPA/Hibernate）"]
  Flyway["Flyway（DB Migration）"]
  Telemetry["Telemetry 服务"]
  OIDC["OIDC Provider（OAuth2/OIDC）"]
  SMTP["SMTP（邮件）"]

  UI -->|HTTP(S) /| Nginx
  Nginx -->|静态文件| UI
  Nginx -->|REST /api/*| API
  Nginx -->|WebSocket /ws| API

  API -->|JPA| DB
  API --> Flyway
  API --> Telemetry
  API --> OIDC
  API --> SMTP
```

## booklore-api 包结构（com.adityachandel.booklore）

```mermaid
flowchart TB
  subgraph API["booklore-api（Spring Boot）"]
    direction TB

    subgraph Config["config / config.security"]
      Cfg["配置与基础设施\n(Security/WebSocket/OpenAPI/MVC/TaskExecutor...)"]
    end

    subgraph Controller["controller"]
      Ctrl["HTTP API（REST）"]
    end

    subgraph Service["service / crons / task"]
      Svc["业务服务（book/file/opds/task/user/...）"]
      Cron["定时/后台流程（crons）"]
      Task["任务系统（task/tasks）"]
    end

    subgraph Mapper["mapper"]
      Map["DTO/Entity 映射（MapStruct）"]
    end

    subgraph Model["model"]
      DTO["model.dto（对外/前端契约）"]
      Ent["model.entity（JPA 实体）"]
      Enum["model.enums / websocket"]
    end

    subgraph Repo["repository"]
      R["Spring Data JPA Repositories"]
    end

    subgraph Util["util / convertor / exception"]
      U["工具/转换器/异常模型"]
    end

    Ctrl --> Svc
    Cron --> Svc
    Task --> Svc

    Svc --> R
    Svc --> Map
    Svc --> U

    Map --> DTO
    Map --> Ent
    R --> Ent
  end

  DB["MariaDB"]
  Ext["外部系统\n(OIDC/SMTP/Telemetry/第三方元数据站点等)"]

  R --> DB
  Svc --> Ext
  Cfg --> Ctrl
  Cfg --> Svc
```

## booklore-ui 包结构（src/app）

```mermaid
flowchart TB
  subgraph UI["booklore-ui（Angular）"]
    direction TB

    subgraph Core["core"]
      CoreCfg["config（API_CONFIG）"]
      CoreSec["security（OIDC/JWT/拦截器/Guard）"]
      CoreSvc["services（加载/登录后初始化等）"]
    end

    subgraph Features["features"]
      Book["book（浏览/编辑/阅读器等）"]
      Bookdrop["bookdrop（导入/审核/批处理）"]
      Dashboard["dashboard"]
      Metadata["metadata"]
      MagicShelf["magic-shelf"]
      Settings["settings（设备/OPDS/邮件/偏好等）"]
      Readers["readers（epub/pdf/cbx）"]
    end

    App["app.routes / app.component"]

    App --> Core
    App --> Features
    Features --> CoreSec
    Features --> CoreCfg
    Features --> CoreSvc
  end

  API["booklore-api"]
  Features -->|HTTP API / WebSocket| API
```

