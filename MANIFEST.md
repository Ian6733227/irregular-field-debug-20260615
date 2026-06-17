# 异形场地模块独立调试包 Manifest

生成时间：2026-06-15 15:51:45 CST

## 范围

- 交付目录：`/Users/yinyin/Documents/软件开发/outputs/irregular-field-debug-20260615`
- 来源目录：`/Users/yinyin/claude/安耐康球场设计/拼接工具/gantang-grid-designer`
- 文件数：13
- 总大小：1.5M

## 核心入口

- `index.html`：顶层启动页
- `gantang-grid-designer/gantang-grid-designer.html`：独立异形场地设计器
- `gantang-grid-designer/integration-host-demo.html`：iframe 宿主调试 demo
- `gantang-grid-designer/gantang-grid-designer-integration.md`：postMessage/API 集成说明

## 验证结果

- HTTP 服务：`http://127.0.0.1:8767/` 返回 200
- 独立设计器：`gantang-grid-designer.html?image=import-batch/cad-screenshot-06.png` 返回 200
- 内联脚本语法：
  - `gantang-grid-designer.html` 通过 `node --check`
  - `integration-host-demo.html` 通过 `node --check`
- 宿主通信：
  - `ready` 收到 `gantang-grid-designer.bridge.v1`
  - `get-project` 返回 `schema=gantang-project.v1`
  - `set-scale` 后 `scale.needsCalibration=false`
- 导出 smoke：
  - 测试图纸：`测试 002 L 型校园场地`
  - 格网状态：`21224格 · 51.00m×31.00m`
  - CSV 下载：`gantang-takeoff-report-2026-06-15.csv`，815 bytes，包含报表标题和 `扣除区域`
  - JSON 下载：`gantang-project-2026-06-15.json`，2296 bytes，`schema=gantang-project.v1`，`regions=2`，包含 `hole`，`scale.needsCalibration=false`，`takeoff.totalTilesCount=21224`
  - Playwright 控制台 warn/error：0

## 2026-06-15 修改后验证

- 交付门禁：
  - `?image=import-batch/cad-screenshot-06.png` 新导入状态为 `delivery.status=blocked`
  - CSV / 裁切 SVG / 打印 PDF 按钮在 blocked 状态禁用
  - 直接导入 accept 仅包含 PNG / JPG / JPEG / WEBP / SVG
- L 型基线：
  - `测试 002 L 型校园场地` 为 `delivery.ready=true`
  - `takeoff.totalTilesCount=21224`
  - `sum(takeoff.byMaterial.*.totalTilesCount)=21224`
  - 官方 JSON 下载：`gantang-project-official-2026-06-15.json`
  - CSV 下载：`gantang-takeoff-report-2026-06-15.csv`，包含 `分材料汇总` 和 `扣除区域`
- 裁切 SVG：
  - `测试 003 中庭扣洞场地`：`cutTilesCount=514`
  - SVG 下载：`gantang-cut-pieces-2026-06-15.svg`，包含 `data-cut-id`
- Bridge / 宿主 demo：
  - `export-summary` 返回 `schema=gantang-project-summary.v1`
  - blocked 正式 `get-project` 返回 validation/blocked 信息
  - 同页 `window.GantangGridDesigner.getProject()` 在 blocked 状态会抛出门禁错误
  - 同页 `getDraftProject()` 显式返回 `exportMode=draft`
  - host demo iframe 自动传 `parentOrigin`
- Debug 隔离：
  - 调试路径显示实时 JSON 和测试图纸
  - 非 debug 路径隐藏实时 JSON 和测试图纸
  - 非 debug 路径隐藏 textarea 不再序列化大 JSON，`hiddenJsonLength=0`
- 裁切 SVG：
  - SVG 根元素使用 `width="100%" height="100%"` 和 meter-based `viewBox`
- Playwright smoke 控制台 error/pageerror：0

## 2026-06-15 19:25 障碍物候选识别改造

- 新版本标记：`v20260615-1925` / `manifest.version=1.1.0-obstacle-detection`
- 回退备份：
  - `_backup/gantang-grid-designer-v20260615-before-obstacle-detection.html`
- 修改文件：
  - `gantang-grid-designer/gantang-grid-designer.html`
  - `gantang-grid-designer/manifest.json`
  - `MANIFEST.md`
- 修改内容：
  - 新增 `state.obstacleDetection={runs,candidates}` 独立候选层，候选不混入 `state.regions`
  - 新增“柱 / 树候选识别”面板、候选列表、橙色虚线 overlay、确认/忽略/批量操作
  - 确认候选后生成标准 `type="hole"` 扣除区域，并记录 `sourceCandidateId`
  - `pending` 候选作为 `unconfirmed_obstacle_candidates` critical error 阻断正式导出
  - `exportProjectData` / `hostProjectSummary` / `exportProjectSummary` 增加 obstacleDetection 审计摘要
  - 新增轻量 Canvas 连通域扫描：比例尺校准后、闭合铺装区 ROI 内识别柱/树候选
  - 复核后补强：批量确认二次确认、唯一 `region-*` ID、候选确认前铺装区/重叠校验、候选来源 hole 禁止改为铺装区
  - 最终复核后补强：`review-obstacle-candidate` 返回 `result.ok/reason/message`，API 失败默认不弹 alert，`reject` 回包保留原动作，批量确认失败会汇总提示
  - 同步 `gantang-grid-designer-integration.md`：补 obstacleDetection 字段、门禁码和 postMessage 方法
- 验证命令与结果：
  - `node` 提取并编译 1 个 inline script：通过
  - Playwright clean context：bridge 挂载、默认预设 ready、pending 候选阻断、确认候选转 hole 并恢复 ready：通过
  - Playwright 真实扫描：默认预设生成 78 个 pending 候选；`regions` 仍仅包含 `tiling`；正式门禁被 pending 候选阻断：通过
  - Playwright 批量确认：弹出二次确认；取消后候选仍保持 pending：通过
  - Playwright review API：中心在铺装区内候选返回 `ok=true` 并生成 hole；越界候选返回 `ok=false/reason=outside_tiling`、无弹窗、并保持 pending 阻断；`action=reject` 回包保留 `reject`：通过
  - 桌面/移动截图：
    - `obstacle-detection-desktop-20260615.png`
    - `obstacle-detection-mobile-20260615.png`
- 未验证边界：
  - 未接入真实宿主生产 BOM/报价系统
  - 未对真实 DXF/DWG 矢量块做直接解析；当前仍是网页调试包内的 Canvas 候选识别
  - 候选识别是辅助预筛，不能替代人工确认

## 2026-06-16 12:20 P0 交付门禁补强

- 新版本标记：`v20260616-1220` / `manifest.version=1.1.1-obstacle-p0-guards`
- 回退备份：
  - `_backup/gantang-grid-designer-v20260616-before-p0-fixes.html`
- 修改文件：
  - `gantang-grid-designer/gantang-grid-designer.html`
  - `gantang-grid-designer/manifest.json`
  - `gantang-grid-designer/gantang-grid-designer-integration.md`
  - `MANIFEST.md`
- 修改内容：
  - `runObstacleDetection({ silentAlert:true })` 与 host `run-obstacle-detection` 返回 `result.ok/reason/message`，API 前置条件失败不再弹窗阻塞宿主。
  - `cloneObstacleDetectionState()` 增加 `summary`，宿主读取候选状态不必自行统计。
  - `applyProjectData()` 导入项目时强制 `sourceCandidateId` 区域保持 `type="hole"`，防止 JSON 篡改成铺装区。
  - `validateProjectForDelivery()` 增加 `candidate_region_type_invalid` 与 `obstacle_detection_scale_changed` critical 门禁。
  - 已确认候选若缺少识别时比例快照，或当前比例尺与识别时比例尺不一致，必须重新扫描并确认。
  - `recognition_area_too_large` 也进入结构化失败返回，不再从底层识别函数直接弹窗。
  - `runs` 裁剪保留最近 20 条以及已确认候选引用的 run，避免比例尺快照被裁掉后误阻断。
- 验证命令与结果：
  - `node` 提取并编译 1 个 inline script：通过。
  - `integration-host-demo.html` inline script：通过 `node --check`。
  - `manifest.json` JSON 解析：通过。
  - Playwright API 前置条件：`image=import-batch/cad-screenshot-06.png` 未标定时 `runObstacleDetection()` 返回 `ok=false/reason=scale_unverified`，无弹窗、无 console error。
  - Playwright 主链路：`builtin-test-002` 扫描生成 78 个 pending；pending 时 `unconfirmed_obstacle_candidates` 阻断 official `getProject`；accept 返回 `ok=true/linkedHoleId`；reject 保留 `action=reject`；重复 accept 返回 `candidate_not_pending`。
  - Playwright 处理完成：1 个 confirmed、77 个 ignored、pending=0；official 导出恢复；`obstacleDetection.schema=gantang-obstacle-detection.v1`；`sourceCandidateId` hole 数=1。
  - Playwright JSON 篡改防线：把 `sourceCandidateId` 区域伪造成 `tiling` 后再加载，系统强制恢复为 `hole`。
  - Playwright 比例尺变化防线：已确认候选后修改比例尺，`obstacle_detection_scale_changed` critical 阻断 official `getProject`。
  - Playwright iframe host smoke：宿主 `postMessage run-obstacle-detection` 前置失败返回结构化 `result`，无弹窗、无 console error。
  - CS 复核后补丁：ROI 过大路径改为结构化 `recognition_area_too_large`；`runs` 裁剪保留已确认候选引用的比例尺快照。
  - CS 补丁后回归：inline JS / host demo JS / manifest parse 通过；Playwright 主链路、JSON 篡改防线、比例尺变化阻断、iframe host silent API 均通过。
  - 只读 reviewer 复核：agy 终审通过，无 P0；CS 终审通过，无 P0。
- 未验证边界：
  - 真实宿主生产 BOM/报价系统仍未接入。
  - 算法召回/误检仍需真实室内多柱、室外多树样本人工抽检。

## 2026-06-16 15:08 状态完整性补强

- 新版本标记：`v20260616-1508` / `manifest.version=1.1.2-state-integrity`
- 回退备份：
  - `_backup/gantang-grid-designer-v20260616-1508-before-state-fixes.html`
- 修改文件：
  - `gantang-grid-designer/gantang-grid-designer.html`
  - `gantang-grid-designer/manifest.json`
  - `gantang-grid-designer/gantang-grid-designer-integration.md`
  - `MANIFEST.md`
- 修改内容：
  - `loadProject` / 初始草稿恢复在项目缺少 `obstacleDetection` 时重置为空候选层，避免继承上一项目的 pending/confirmed 状态。
  - undo/redo 历史快照增加 `currentImagePath/currentImageDataUrl/currentImageMimeType/currentImageKind/currentImageSource`，撤销/重做换图操作时同步恢复底图源。
  - `validateProjectForDelivery()` 增加 `candidate_region_link_invalid` critical 门禁，带 `sourceCandidateId` 的扣除区必须关联对应 confirmed candidate。
  - 打印报表仅在 `printReport()` 本次生成后通过 `data-print-ready="true"` 进入 print media；项目变更和 `afterprint` 会清除打印就绪标记，避免 Ctrl+P 打印旧报表。
  - CS 复审建议后补强：undo/redo 也主动清除打印就绪标记，避免打印对话框前后的窄窗口残留。
  - 历史图纸卡片改用 `data-history-id`，不再把动态 ID 直接拼进 inline JS 字符串。
  - `applyProjectImageSource()` 对无 Data URL 的项目底图路径执行相对路径过滤。
- 验证命令与结果：
  - `node` 提取并编译 1 个 inline script：通过。
  - `manifest.json` JSON 解析：通过。
  - Playwright 主链路：扫描生成 78 个 pending；CSV/SVG/print 按钮禁用；accept 后可生成 official 项目：通过。
  - Playwright 旧项目隔离：先扫描生成候选，再载入无 `obstacleDetection` 的旧 JSON，候选 summary 归零且 `delivery.ready=true`：通过。
  - Playwright undo/redo 换图：`gantang-page08-plan.png -> import-batch/cad-screenshot-06.png -> undo -> gantang-page08-plan.png -> redo -> import-batch/cad-screenshot-06.png`：通过。
  - Playwright sourceCandidateId 关联门禁：删除 candidate 后保留 `sourceCandidateId` hole，返回 `candidate_region_link_invalid`：通过。
  - Playwright 打印残留：`printReport()` / 项目变更后 `data-print-ready` 不残留：通过。
  - 只读 reviewer 复审：CS 通过，无 P0；glm5.1 通过，无 P0；agy 两次超时，无有效输出。
- 未验证边界：
  - 真实 iPad/Safari 触摸操作仍未验证。
  - 真实宿主生产 BOM/报价系统仍未接入。

## 2026-06-17 批次一 P0/P1 修复（Claude 实施，待复核）

- 新版本标记：`v20260617-batch1` / `manifest.version=1.1.3-batch1-p0-p1`
- 回退备份：
  - `_backup/gantang-grid-designer-v20260617-before-batch1-p0-p1.html`
- 修改文件：
  - `gantang-grid-designer/gantang-grid-designer.html`
  - `gantang-grid-designer/manifest.json`
  - `gantang-grid-designer/gantang-grid-designer-integration.md`
  - `package.json`（新增）、`scripts/check-inline.js`（新增）
  - `MANIFEST.md`
- 修改内容：
  - **P0-1**：`DEBUG_MODE` 删除 `pathname.includes('irregular-field-debug')` 触发，仅认 `?debug=1|true`；交付目录名不再强制开启调试，恢复非 debug 路径对实时 JSON 与内置测试图纸的隐藏。
  - **P0-2**：`validateProjectForDelivery()` 新增**非阻断** warning `obstacle_candidates_all_ignored`，仅当本项目扫描过（`runs` 非空）且 `confirmed===0` 且 `ignored>0` 时触发；交付门禁面板新增"已识别/已确认/已忽略/待确认"计数与 warning 展示。从未扫描的项目不报此 warning。
  - **P0-3**：新增 `package.json` 与零依赖 `scripts/check-inline.js`，`npm test` 可在本包内校验所有内联脚本语法 + `manifest.json` 解析；同步修订 integration.md 验收/预处理段，标注 `package:grid-designer`/`prepare:plan-import` 属主仓库环境。
  - **P1-1**：候选→扣除区校验从 center-only 升级——`candidateInsideClosedTiling` 要求候选多边形 ≥80% 顶点落在铺装区内；`candidateOverlapsExistingHole` 改用多边形实际相交（新增 `polygonsIntersect`），中心距仅作退化兜底。
  - **P1-2**：新增 `trimIgnoredObstacleCandidates()`（`MAX_IGNORED_OBSTACLE_CANDIDATES=200`），每次扫描后裁剪 ignored 候选，防止反复扫描后无限堆积。
  - **P1-3**：新增 `#printFallbackNotice`，未通过"打印 / PDF"按钮直接 Ctrl+P 时打印提示页而非空白页。
  - **P1-5**：`image.crossOrigin='anonymous'`；`detectObstacleCandidates`/`sampleDraftingPixels`/`printReport` 的 `getImageData`/`toDataURL` 加 try/catch，跨域受限时返回结构化失败（`image_read_blocked`）或友好提示，不抛未捕获异常。
  - **P1-6**：`emitHostChange()` 统一调用 `updateDeliveryGatePanel()`，任何通知宿主的状态变更都同步刷新本地门禁面板。
- 验证命令与结果：
  - `npm test`（`node scripts/check-inline.js`）：内联脚本语法 + manifest 解析全部通过。
  - 待复核：交付门禁/候选/扣洞/导出/undo/print/iframe host 的人工模拟回归（见 `REVIEW-CHECKLIST.md` G1–G8 与 T1–T10）。
- 未验证边界：
  - 本批次为 Claude 实施、尚未经只读 reviewer 终审。
  - 真实 iPad/Safari 触摸操作仍未验证；真实宿主生产 BOM/报价系统仍未接入。
  - DWG/DXF/PDF 浏览器内导入为批次二，本批次未包含。

## SHA-256

```text
42f561d59180d6e333d2659aa3ed6e75fd03a97a01f4c29ca354d185dc1f6f7b  ./README.md
2c3dff1c92da22afa14ec9fdd30cb6e98f2eb1ec3fe73878e06ffbcb9d6340b5  ./gantang-grid-designer/gantang-grid-designer-integration.md
0ecaf8885adb166b2c3ba859f1bd9367b4b45902d86f1ca0a122ef664c50251f  ./gantang-grid-designer/gantang-grid-designer.html
1d2ab502040cf7ae86348b0aeeb6cd6f3b30b4d49950e14f6b2592d5bc84e6e8  ./gantang-grid-designer/gantang-page08-plan.png
5cfc1a057c26f59ab191821787ff5e01848b73cc40e954e2b061a04dfa4bb86f  ./gantang-grid-designer/history-drawings/history-001-cad-screenshot-06.png
636ff6b93119137ed414c4d28c708cecc7dd449c2a857f36b2eb6f4a00b56f50  ./gantang-grid-designer/history-drawings/history-002-school-l-plan.svg
162f135f1183707572f45e7482bee1845c086461591afb0ac7e6757cee9b60ca  ./gantang-grid-designer/history-drawings/history-003-courtyard-hole.svg
6d5c36baf1a7e8ecb914cc98e2b2b31578c33c51f2c17438aaebd54b6cf19d60  ./gantang-grid-designer/history-drawings/history-004-narrow-angled-plan.svg
5cfc1a057c26f59ab191821787ff5e01848b73cc40e954e2b061a04dfa4bb86f  ./gantang-grid-designer/import-batch/cad-screenshot-06.png
b4a8fc495f55767c9a9d28f4b15fb337e235975ea26f9cebda330a6d44dfc6ba  ./gantang-grid-designer/integration-host-demo.html
ad9d4013130315c2a97f18c67d0eaeda021e00cf8f2f0078606528900a41dabb  ./gantang-grid-designer/manifest.json
8d357e63a161d0f613e4b2994f7a50291f69672ba00df1166896584731c62c5a  ./gantang-grid-designer/smoke-dim-labels-after-fix.png
852649512ca544ab9baeeda2d2305f87368ff2484096df20fcd63e5898256cca  ./index.html
712f370cc9796acfb494b641a8817f104627b41cb0243b59469c15f8384ff3e7  ./package.json
ca441674f369bc2fd6b8503e4274b2111e3155da6d21b1af80c859d113b1648b  ./scripts/check-inline.js
```

## 本地预览

```bash
python3 -m http.server 8767 --bind 127.0.0.1 --directory /Users/yinyin/Documents/软件开发/outputs/irregular-field-debug-20260615
```

打开：

```text
http://127.0.0.1:8767/
```
