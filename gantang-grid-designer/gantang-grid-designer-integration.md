# 甘棠悬浮地板深化设计工具集成交接

版本：`gantang-grid-designer.bridge.v1`

## 交付内容

- 调试包根目录：`/Users/yinyin/Documents/软件开发/outputs/irregular-field-debug-20260615`
- 主页面：`gantang-grid-designer/gantang-grid-designer.html`
- 宿主演示：`gantang-grid-designer/integration-host-demo.html`
- 当前包为独立调试包；同步到真实宿主/生产包前，需要把本文件中协议变更同步到真实宿主项目。

## 适合的集成方式

推荐把 `gantang-grid-designer.html` 作为一个内嵌页面使用：

```html
<iframe
  id="designer"
  src="./gantang-grid-designer.html?image=import-batch/cad-screenshot-06.png&parentOrigin=https%3A%2F%2Fhost.example.com"
  style="width:100%;height:100vh;border:0"
></iframe>
```

宿主程序通过 `postMessage` 和设计器通信。Web、Electron、Tauri、WKWebView、Android WebView 都可以按这个模式接。

跨域嵌入时建议显式传 `parentOrigin` 或 `hostOrigin`，值为宿主页面的 origin，例如 `https://erp.example.com`。这样 Firefox/Safari 或严格 Referrer-Policy 下不会因为 `document.referrer` 被剥离而误阻断宿主消息。`file://` 本地调试仍会降级使用 `*`。

## 输入格式

### 直接支持

- PNG
- JPG / JPEG
- WEBP
- SVG
- 已转成 PNG 的 PDF 页面截图

### 需要预处理

PDF / Word 先转 PNG：

```bash
npm run prepare:plan-import -- --source "你的文件.pdf" --pdf-page 1 --out-dir gantang-grid-designer/import-batch
```

DWG/DXF 暂不走网页直接导入，先由外部 CAD 解析或截图成 PNG，再给本页面做手动框选、吸附、比例尺和排布。

## postMessage 协议

宿主发给设计器的消息必须带：

```js
{
  source: 'gantang-grid-host',
  type: 'gantang-grid-designer:get-project',
  requestId: 'optional-id',
  payload: {}
}
```

设计器返回：

```js
{
  source: 'gantang-grid-designer',
  type: 'gantang-grid-designer:project',
  version: 'gantang-grid-designer.bridge.v1',
  payload: {
    requestId: 'optional-id',
    project: {}
  }
}
```

### ready

设计器初始化后会主动发送：

```js
{
  source: 'gantang-grid-designer',
  type: 'gantang-grid-designer:ready',
  payload: {
    capabilities: [
      'get-project',
      'load-project',
      'set-image',
      'set-scale',
      'set-mode',
      'export-summary',
      'get-obstacle-candidates',
      'run-obstacle-detection',
      'review-obstacle-candidate'
    ],
    summary: {}
  }
}
```

### 获取项目 JSON

默认获取的是“正式项目”。项目未通过交付门禁时，不返回 `project`，而返回 `project-blocked`。

```js
iframe.contentWindow.postMessage({
  source: 'gantang-grid-host',
  type: 'gantang-grid-designer:get-project',
  requestId: crypto.randomUUID()
}, '*');
```

通过时返回 `payload.project`，schema 为 `gantang-project.v1`。

```js
{
  source: 'gantang-grid-designer',
  type: 'gantang-grid-designer:project',
  payload: {
    requestId,
    project: {
      schema: 'gantang-project.v1',
      exportMode: 'official',
      delivery: { ready: true, status: 'ready', validation: {} }
    }
  }
}
```

未通过时返回：

```js
{
  source: 'gantang-grid-designer',
  type: 'gantang-grid-designer:project-blocked',
  payload: {
    requestId,
    validation: {
      schema: 'gantang-delivery-validation.v1',
      ready: false,
      status: 'blocked',
      errors: []
    },
    summary: {}
  }
}
```

如果宿主只想取草稿，需要显式传 `allowDraft: true`，并且不能直接用于正式报价：

```js
iframe.contentWindow.postMessage({
  source: 'gantang-grid-host',
  type: 'gantang-grid-designer:get-project',
  requestId: crypto.randomUUID(),
  payload: { allowDraft: true }
}, '*');
```

草稿返回 `project.exportMode === 'draft'`。

### 获取轻量摘要

`export-summary` 始终返回轻量摘要，宿主必须先检查 `payload.summary.delivery.ready`。`ready=false` 时只能展示问题或保存草稿，不能生成正式 BOM/报价。

```js
iframe.contentWindow.postMessage({
  source: 'gantang-grid-host',
  type: 'gantang-grid-designer:export-summary',
  requestId: crypto.randomUUID()
}, '*');
```

返回：

```js
{
  source: 'gantang-grid-designer',
  type: 'gantang-grid-designer:summary',
  payload: {
    requestId,
    summary: {
      schema: 'gantang-project-summary.v1',
      takeoff: {
        totalTilesCount: 0,
        byMaterial: {}
      },
      obstacleDetection: {
        pending: 0,
        confirmed: 0,
        ignored: 0,
        total: 0
      },
      delivery: {
        ready: false,
        status: 'blocked',
        validation: {}
      }
    }
  }
}
```

### 柱 / 树候选识别

障碍物识别是“候选识别 + 人工确认”流程，不是全自动扣量。宿主必须遵守：

- `project.regions` 仍然只表示正式几何：`tiling` / 已确认 `hole`
- `project.obstacleDetection.candidates` 是审计和待处理候选，不参与正式 `takeoff`
- 存在 `status="pending"` 候选时，`validateProjectForDelivery()` 会返回 `unconfirmed_obstacle_candidates` critical error
- 带 `sourceCandidateId` 的扣除区必须关联对应 `status="confirmed"` 候选，否则返回 `candidate_region_link_invalid`
- 旧项目 JSON 没有 `obstacleDetection` 字段时会重置为空候选层，不继承当前页面上一个项目的候选状态
- 宿主正式 BOM / 报价必须同时满足 `delivery.ready === true`、`exportMode === "official"`、`obstacleDetection.summary.pending === 0`，不能只读取 `summary.takeoff`

项目 JSON 会包含：

```js
{
  schema: 'gantang-project.v1',
  regions: [
    { type: 'tiling' },
    { type: 'hole', sourceCandidateId: 'obs-cand-...' }
  ],
  obstacleDetection: {
    schema: 'gantang-obstacle-detection.v1',
    summary: { pending: 0, confirmed: 1, ignored: 0, total: 1 },
    runs: [],
    candidates: [
      {
        id: 'obs-cand-...',
        kind: 'column',
        status: 'confirmed',
        linkedHoleId: 'region-2'
      }
    ]
  }
}
```

可选 postMessage 方法：

```js
// 获取候选审计状态
iframe.contentWindow.postMessage({
  source: 'gantang-grid-host',
  type: 'gantang-grid-designer:get-obstacle-candidates',
  requestId: crypto.randomUUID()
}, '*');

// 触发一次候选识别。识别前必须已完成比例尺和闭合铺装区。
iframe.contentWindow.postMessage({
  source: 'gantang-grid-host',
  type: 'gantang-grid-designer:run-obstacle-detection',
  requestId: crypto.randomUUID(),
  payload: {
    settings: { kind: 'column', minSizeM: 0.25, maxSizeM: 1.2, sensitivity: 0.58 }
  }
}, '*');

// 人工确认或忽略候选。accept 会生成正式 hole。
iframe.contentWindow.postMessage({
  source: 'gantang-grid-host',
  type: 'gantang-grid-designer:review-obstacle-candidate',
  requestId: crypto.randomUUID(),
  payload: { id: 'obs-cand-...', action: 'accept' } // 或 action: 'ignore'
}, '*');
```

对应返回类型：

- `gantang-grid-designer:obstacle-candidates`
- `gantang-grid-designer:obstacle-detection-run`
- `gantang-grid-designer:obstacle-candidate-reviewed`

`obstacle-detection-run` 会带结构化识别结果；宿主调用时不会弹窗阻塞：

```js
{
  result: {
    ok: false,
    reason: 'scale_unverified',
    message: '请先完成比例尺标定，再识别柱/树候选。'
  },
  obstacleDetection: {},
  summary: {}
}
```

常见 `reason` 包括：`image_not_loaded`、`scale_unverified`、`no_closed_tiling_region`、`recognition_area_too_large`。

`obstacle-candidate-reviewed` 会带结构化结果：

```js
{
  result: {
    ok: true,
    action: 'accept',
    id: 'obs-cand-...',
    linkedHoleId: 'region-2'
  },
  obstacleDetection: {},
  summary: {}
}
```

若候选越界、重叠或已处理，`result.ok=false`，并返回 `reason/message`；宿主不要只靠前后数量变化判断是否成功。正式项目门禁还会检查 `candidate_region_link_invalid`、`candidate_region_type_invalid`、`obstacle_detection_scale_changed` 等 critical code。

### 加载项目 JSON

```js
iframe.contentWindow.postMessage({
  source: 'gantang-grid-host',
  type: 'gantang-grid-designer:load-project',
  requestId: crypto.randomUUID(),
  payload: { project }
}, '*');
```

### 设置底图

用相对文件路径：

```js
iframe.contentWindow.postMessage({
  source: 'gantang-grid-host',
  type: 'gantang-grid-designer:set-image',
  requestId: crypto.randomUUID(),
  payload: {
    fileName: 'imports/page-1.png',
    mimeType: 'image/png'
  }
}, '*');
```

用 Data URL：

```js
iframe.contentWindow.postMessage({
  source: 'gantang-grid-host',
  type: 'gantang-grid-designer:set-image',
  requestId: crypto.randomUUID(),
  payload: {
    fileName: 'customer-plan.png',
    imageDataUrl: 'data:image/png;base64,...',
    mimeType: 'image/png'
  }
}, '*');
```

设置新底图后会清空当前框选区域，并把比例尺标为“待校准”。

### 设置比例尺

```js
iframe.contentWindow.postMessage({
  source: 'gantang-grid-host',
  type: 'gantang-grid-designer:set-scale',
  requestId: crypto.randomUUID(),
  payload: {
    metersPerPixel: 0.02468381,
    source: 'host-confirmed-two-point',
    lengthM: 9.7,
    points: [{ x: 390, y: 1466 }, { x: 783, y: 1466 }]
  }
}, '*');
```

设置成功后 `scale.needsCalibration` 会变成 `false`。

### 切换模式

```js
iframe.contentWindow.postMessage({
  source: 'gantang-grid-host',
  type: 'gantang-grid-designer:set-mode',
  payload: { mode: 'region' }
}, '*');
```

支持模式：`region`、`calibrate`、`grid`、`pan`。

## 也可以同页面直接调用

如果宿主和设计器在同一个 window 里，可以用：

```js
const project = window.GantangGridDesigner.getProject(); // 未通过交付门禁会 throw
const draftProject = window.GantangGridDesigner.getDraftProject(); // 明确取草稿
const summary = window.GantangGridDesigner.exportSummary();
const validation = window.GantangGridDesigner.validateProjectForDelivery();
window.GantangGridDesigner.setImage({ fileName: 'imports/page-1.png' });
window.GantangGridDesigner.setScale({ metersPerPixel: 0.02468381, source: 'host-confirmed' });
window.GantangGridDesigner.loadProject(project);
```

## 输出 JSON 关键字段

```js
{
  schema: 'gantang-project.v1',
  exportMode: 'official|draft',
  delivery: {
    ready: true,
    status: 'ready|blocked',
    validation: {}
  },
  imagePath: '...',
  imageKind: 'url-raster|host-raster|imported-raster',
  scale: {
    metersPerPixel: 0.02468381,
    points: [],
    lengthM: 9.7,
    needsCalibration: true,
    source: 'imported-drawing-unverified'
  },
  grid: {
    origin_px: { x: 0, y: 0 },
    rotation_deg: 0,
    tileSize_m: 0.25
  },
  regions: [
    {
      id: 'region-1',
      name: '导入图纸铺装边界',
      material: 'floating-floor',
      type: 'tiling',
      closed: true,
      points_px: [{ x: 100, y: 100 }]
    }
  ],
  takeoff: {
    netCoveredArea_m2: 0,
    fullTilesCount: 0,
    cutTilesCount: 0,
    totalTilesCount: 0,
    totalTileArea_m2: 0,
    wasteArea_m2: 0,
    byMaterial: {
      'floating-floor': {
        material: 'floating-floor',
        netCoveredArea_m2: 0,
        fullTilesCount: 0,
        cutTilesCount: 0,
        totalTilesCount: 0,
        totalTileArea_m2: 0,
        wasteArea_m2: 0
      }
    },
    cutPieces: {},
    cutPiecesDetailed: [
      {
        cutId: 'cut_1_2',
        orientation_deg: 0,
        polygonLocal: []
      }
    ]
  },
  warnings: []
}
```

交付前必须检查：

- `delivery.ready === true`
- `scale.needsCalibration === false`
- 至少一个 `type === 'tiling' && closed === true` 的区域
- 若有不铺区域，必须作为 `type === 'hole'` 的闭合区域
- `takeoff.totalTilesCount > 0`
- `takeoff.byMaterial` 的片数求和等于 `takeoff.totalTilesCount`
- `warnings` 为空或被业务明确接受；`validation.errors` 必须为空

## 嵌入安全边界

- 页面只接受安全相对路径或 Data URL 设置底图。
- 区域名、材料名、裁切表和打印表已做 HTML 转义。
- CSV 导出已做字段转义和公式注入保护。
- 宿主仍应按自己的权限模型过滤文件路径和来源。

## 验收命令

```bash
awk '/<script>/{flag=1; next} /<\\/script>/{flag=0} flag {print}' gantang-grid-designer/gantang-grid-designer.html | node --check -
awk '/<script>/{flag=1; next} /<\\/script>/{flag=0} flag {print}' gantang-grid-designer/integration-host-demo.html | node --check -
npm test
npm run package:grid-designer
```

已知限制：

- 自动吸附是局部图纸线像素吸附，不等于完整 CAD 矢量识别。
- PDF/Word 需要先转 PNG。
- DWG/DXF 商用内置解析需单独做授权和解析链路，当前交接包只覆盖截图/PDF 转 PNG后的人工框选、吸附、比例尺和铺格。
