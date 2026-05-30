# AI Interview Web

AI Interview Web 是一个基于 React + Vite 的 AI 面试前端控制台，用于连接后端的简历分析、知识库、RAG 问答、模拟面试和异步任务能力。

## 功能概览

- **总览看板**：聚合简历、知识库、会话和任务数据，并通过 ECharts 展示资源概览、任务状态、活跃趋势和知识分类分布。
- **简历分析**：支持上传简历、按 ID 查询、查看评分与改进建议、重新分析、删除、导出分析 PDF，以及基于 JD 的匹配分析。
- **知识库管理**：上传知识文档并分类，查看知识库列表，按分类筛选，删除或重新向量化知识文档。
- **RAG 会话**：创建、归档、删除会话，维护会话标题和知识源，通过 SSE 流式接收问答结果。
- **模拟面试**：基于简历、JD 和知识库创建面试会话，支持文本流式对话和语音面试接口。
- **任务中心**：按资源类型和资源 ID 查询简历、知识库相关异步任务状态。

## 技术栈

- React 18
- TypeScript
- Vite 5
- Tailwind CSS 4
- Base UI / shadcn 风格基础组件
- ECharts
- Vitest + Testing Library

## 环境要求

- Node.js 18 或更高版本
- npm
- 可访问的后端服务，默认地址为 `http://localhost:8080`

## 快速开始

安装依赖：

```bash
npm install
```

复制环境变量示例：

```bash
cp .env.example .env
```

按需修改 `.env`：

```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_PROXY_TARGET=http://localhost:8080
```

启动开发服务：

```bash
npm run dev
```

默认访问地址：

```text
http://localhost:5173
```

## 环境变量

| 变量 | 说明 | 默认行为 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 前端请求后端接口时使用的基础地址 | 为空时使用相对路径，并交给 Vite dev server 代理 |
| `VITE_PROXY_TARGET` | Vite 开发代理目标地址 | 未设置时使用 `http://localhost:8080` |

开发环境下，Vite 会代理以下接口前缀到 `VITE_PROXY_TARGET`：

- `/resume`
- `/jd-match`
- `/knowledge`
- `/rag`
- `/task`
- `/interview`

## 可用脚本

```bash
npm run dev
```

启动本地开发服务。

```bash
npm run build
```

执行 TypeScript 构建检查并生成生产构建产物。

```bash
npm run preview
```

预览生产构建结果。

```bash
npm run test
```

运行 Vitest 测试。

## 项目结构

```text
.
├── src
│   ├── api                 # 后端 API 封装
│   ├── app                 # 应用外壳与导航
│   ├── components          # 通用组件与业务弹窗组件
│   ├── features            # 页面级业务工作区
│   │   ├── interview       # 模拟面试
│   │   ├── knowledge       # 知识库
│   │   ├── overview        # 总览看板
│   │   ├── rag             # RAG 会话
│   │   ├── resume          # 简历分析
│   │   └── tasks           # 任务中心
│   ├── shared              # 跨模块共享 UI
│   ├── test                # 测试配置
│   ├── types.ts            # 前端类型定义
│   └── utils.ts            # 数据格式化与归一化工具
├── docs                    # 设计与实现计划文档
├── vite.config.ts          # Vite 配置与开发代理
└── package.json
```

## 后端接口约定

前端默认按统一响应结构解析 JSON：

```ts
interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}
```

其中 `code === 200` 表示成功。RAG 与面试文本对话接口使用 SSE 返回流式内容；简历分析导出接口返回 PDF；语音面试接口上传 `webm` 音频并返回音频 Blob。

## 开发说明

- 最近简历和最近任务记录保存在浏览器 `localStorage` 中。
- 简历和知识库上传后，前端会轮询 `/task/status/{resourceType}/{resourceId}` 直到任务完成或失败。
- API 请求入口集中在 `src/api`，页面状态和业务编排主要在 `src/App.tsx`。
- 新增业务页面时，优先放在 `src/features/<feature-name>`，通用 UI 放在 `src/shared` 或 `src/components`。

