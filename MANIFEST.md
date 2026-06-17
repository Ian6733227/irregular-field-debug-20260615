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

## 2026-06-17 批次二 功能扩展（Claude 实施，浏览器实测，待终审）

- 新版本标记：`v20260617-batch2` / `manifest.version=1.2.0-batch2-features`
- 修改文件：`gantang-grid-designer/gantang-grid-designer.html`、`manifest.json`、`package.json`、新增 `gantang-grid-designer/vendor/*`、`MANIFEST.md`
- 新增本地 vendor 库（离线、不走 CDN）：`jspdf 2.5.1 (MIT)`、`pdf.js 3.11.174 (Apache-2.0)`、`dxf 5.3.1 (MIT)`
- 实施内容（按用户列点 #11/#3/#1/#10/#7/#8/#5/#4/#6/#9）：
  - #11 算量金标准对照：矩形 20×30m@0.25=9600 格/600㎡、对齐洞 −64 格/596㎡、非对齐洞面积守恒、`Σ byMaterial==total` 全部数值正确（验证项，无代码改动）。
  - #3 扣除区几何门禁：`validateProjectForDelivery` 新增 `hole_outside_tiling` / `hole_overlap` critical（多边形相交，复用 `polygonsIntersect`）。
  - #1 触摸端：canvas 改 Pointer Events（鼠标+触屏+笔），`touch-action:none`，长按删点，`pointercancel`/捕获释放；桌面回归不变。
  - #10 比例尺增强：单位系统 m/cm/mm/in、已知面积反推（`mpp=√(area_m²/area_px)`）、多法一致性提示。
  - #7 多项目管理：localStorage 项目列表 保存/切换/删除/新建，配额超限降级只存几何；复用 `exportProjectData`/`applyProjectData` round-trip。
  - #8 一键 PDF：`downloadReportPDF`（vendor jsPDF），交付门禁禁用兜底，`toDataURL` 跨域兜底。
  - #5 PDF/DXF 浏览器内导入：PDF.js 渲染、dxf `toSVG` 光栅化，统一走现有导入管线；最长边封顶 4000px；DXF 读 `insUnits` 预填比例（仅建议，保持未校准）；DWG 升级提示走外部转 DXF；worker 本地。
  - #4 识别内核：模板匹配 NCC（`detectObstacleByTemplate`，含空心方框/圆圈，NMS 去重，工作量上限保护）+ 按置信度批量确认；合成 ground-truth 9/9 命中。
  - #6 报价估算：`buildQuote`（`gantang-quote.v1`，按块/按㎡），进 `exportProjectData`/`exportProjectSummary` 供宿主消费。
  - #9 多材料：分区多材料已存在（4 材料 chips + `byMaterial` + 报价/CSV/JSON 分组），端到端验证通过；拼花（单区内多材料图案）列为后续。
- 验证：`npm test` 通过；Chrome 预览实测（每步 console error=0）：交付门禁/扣洞数值/候选/确认/导入/模板匹配/报价/多项目/触屏均通过；PDF 在可见标签页正常（后台标签页 rAF 挂起为环境现象，非代码缺陷）。
- 未验证边界：
  - 识别召回/精确率仍需真实带标注的室内多柱、室外多树样本抽检（本批为合成 ground-truth 验证）。
  - 真实 iPad/Safari 触摸、真实宿主 BOM/报价系统仍未接入。
  - 本批为 Claude 实施 + 自测，尚未经独立 reviewer 终审。

## 2026-06-17 独立复核修复（Claude 修，浏览器实测）

- 新版本标记：`v20260617-batch2-rev` / `manifest.version=1.2.1-review-fixes`
- 三个独立 reviewer（正确性/回归/安全）从源码重审，发现并修复：
  - **P0 报价/候选 XSS**：`renderQuotePanel` 与候选列表 onclick 原用 `escapeJsString`（不转义 `"`），material 来自项目 JSON 可注入。改为 `data-` 属性 + `escapeHtml`，从 element 读取。实测恶意 material 不执行、无 live `<img>`。
  - **P1 贴边洞误杀 + 越界绕过**：`hole_outside_tiling` / `candidateInsideClosedTiling` 由"顶点数 80%"改为**面积占比采样**（新增 `polygonInsideFraction`，门禁阈值 0.95、候选 0.9）。贴右/下边洞不再误报；多顶点+大外伸洞被正确拦截。
  - **P1 共边洞误判重叠**：`hole_overlap` / `candidateOverlapsExistingHole` 由 `polygonsIntersect`（共边/共点即 true）改为**真实重叠面积**（新增 `polygonsRealOverlap`，阈值 2% 较小洞面积）。相邻不重叠的洞/候选可正常确认；真实重叠仍拦截。
  - **P1 单位切换陷阱**：`onScaleUnitChange` 现调用 `syncInputs()` 按新单位重算输入框（含内联标尺单位标签），杜绝"切单位不重输→100× 比例错误"。实测 9.7m↔970cm 应用后 mpp 一致。
  - **P1 报价/单位 round-trip**：`exportProjectData`/`persistDraft` 增加 `pricing`（mode+unitPrices）与 `scale.lengthUnit`；`applyProjectData`/`loadInitialProjectState` 恢复。实测单价 7 往返保留。
  - **P2 解码上限地板**：PDF/DXF 渲染 `Math.max(0.2/0.1,fit)` 地板下调，不再突破 `MAX_DECODE_DIMENSION`。
- 验证：`npm test` 通过；Chrome 预览实测（console error=0）：XSS 不触发、贴边洞/共边洞/真实重叠/越界绕过、单位切换、报价 round-trip、候选确认回归全部符合预期。
- 未验证边界：识别召回/精确率仍需真实带标注样本；真实 iPad/Safari、真实宿主 BOM/报价未接入；本批仍为 Claude 实施+自测+一轮独立 reviewer，建议正式发布前再过一次人评。

## 2026-06-17 DWG 导入引导（v20260617-batch2-rev2 / 1.2.2-dwg-guidance）

- 真实样本验证：客户提供的 10 个文件均为真二进制 DWG（AC1015 / AutoCAD 2000），内置只支持 DXF/PDF，DWG 需先转换。
- 据此改为引导式提示：用户选择 `.dwg` 时（`accept` 已加入 `.dwg`，否则被文件框过滤掉看不到提示）弹出明确指引——"请先转成 **DXF 或 PDF** 再导入"，并给 DWG→DXF（DWG TrueView / ODA File Converter，免费）与 DWG→PDF（CAD 打印/输出 PDF）两条路径。DWG 不会被误当底图。
- 仅改 `gantang-grid-designer.html`（提示文案 + accept），浏览器实测：`.dwg` 可选、提示含 DXF 与 PDF、不被导入；`npm test` 通过、console error=0。

## SHA-256

```text
42f561d59180d6e333d2659aa3ed6e75fd03a97a01f4c29ca354d185dc1f6f7b  ./README.md
712f370cc9796acfb494b641a8817f104627b41cb0243b59469c15f8384ff3e7  ./package.json
ca441674f369bc2fd6b8503e4274b2111e3155da6d21b1af80c859d113b1648b  ./scripts/check-inline.js
852649512ca544ab9baeeda2d2305f87368ff2484096df20fcd63e5898256cca  ./index.html
60eb3b10d9c69ff9e534e846756cc2f6313c6404739f898ab04c1bcbfb7be008  ./gantang-grid-designer/gantang-grid-designer.html
2c3dff1c92da22afa14ec9fdd30cb6e98f2eb1ec3fe73878e06ffbcb9d6340b5  ./gantang-grid-designer/gantang-grid-designer-integration.md
2602034b4cb3757df3c56117dbcdaea1a02c1d89f5505b614b6281e42af20aa4  ./gantang-grid-designer/manifest.json
b4a8fc495f55767c9a9d28f4b15fb337e235975ea26f9cebda330a6d44dfc6ba  ./gantang-grid-designer/integration-host-demo.html
1d2ab502040cf7ae86348b0aeeb6cd6f3b30b4d49950e14f6b2592d5bc84e6e8  ./gantang-grid-designer/gantang-page08-plan.png
5cfc1a057c26f59ab191821787ff5e01848b73cc40e954e2b061a04dfa4bb86f  ./gantang-grid-designer/import-batch/cad-screenshot-06.png
8d357e63a161d0f613e4b2994f7a50291f69672ba00df1166896584731c62c5a  ./gantang-grid-designer/smoke-dim-labels-after-fix.png
5cfc1a057c26f59ab191821787ff5e01848b73cc40e954e2b061a04dfa4bb86f  ./gantang-grid-designer/history-drawings/history-001-cad-screenshot-06.png
636ff6b93119137ed414c4d28c708cecc7dd449c2a857f36b2eb6f4a00b56f50  ./gantang-grid-designer/history-drawings/history-002-school-l-plan.svg
162f135f1183707572f45e7482bee1845c086461591afb0ac7e6757cee9b60ca  ./gantang-grid-designer/history-drawings/history-003-courtyard-hole.svg
6d5c36baf1a7e8ecb914cc98e2b2b31578c33c51f2c17438aaebd54b6cf19d60  ./gantang-grid-designer/history-drawings/history-004-narrow-angled-plan.svg
98ccf17aa10c20bb1301762618fcc9b6ab3a4e7f26b6071d64d0b41154df3875  ./gantang-grid-designer/vendor/jspdf.umd.min.js
5b5799e6f8c680663207ac5b42ee14eed2a406fa7af48f50c154f0c0b1566946  ./gantang-grid-designer/vendor/pdf.min.js
feabdf309770ed24bba31a5467836cdc8cf639c705af27d52b585b041bb8527b  ./gantang-grid-designer/vendor/pdf.worker.min.js
769e65397d099ea3af3dbd944ad986dac481b585004507a112840b6e16728485  ./gantang-grid-designer/vendor/dxf.js
```

## 本地预览

```bash
python3 -m http.server 8767 --bind 127.0.0.1 --directory /Users/yinyin/Documents/软件开发/outputs/irregular-field-debug-20260615
```

打开：

```text
http://127.0.0.1:8767/
```
