# 交接文档 — 甘棠异形场地设计器（gantang-grid-designer）

> 面向接手的 Codex/工程师。冷启动可直接照此工作。最后更新：2026-06-17。
> 实施者：Claude（Opus 4.8）。状态：**Claude 实施 + 自测 + 一轮独立 reviewer**，**未经人评终审、未上线**。

---

## 0. 一句话

纯前端单文件工具：CAD 截图/DXF/PDF → 人工框选铺装区/扣除区 → 比例标定 → 0.25m 悬浮地板铺格算量 → 导出 JSON/CSV/裁切SVG/PDF，并可作 iframe 嵌入宿主。源自「安耐康球场设计/拼接工具」。

## 1. 仓库与产物位置

- 工作副本（本机）：`/Users/yy/Claude/irregular-field-debug-20260615`
- 远程：GitHub `Ian6733227/irregular-field-debug-20260615`（base commit `66542fc`）
- 分支：`fix/batch1-p0-p1`（已 push origin；**PR #1 已开，待终审，勿直接合并**：https://github.com/Ian6733227/irregular-field-debug-20260615/pull/1）
- 主文件：`gantang-grid-designer/gantang-grid-designer.html`（约 7061 行，单文件 + 内联 JS）
- 版本：`manifest.version=1.2.2-dwg-guidance` / `featureVersion=v20260617-batch2-rev2`
- 补丁（可 `git apply` 到真实仓库根目录；在 `/Users/yy/Claude/`）：
  - `batch1+2-no-backup.patch`（推荐，含 vendor、不含 _backup）
  - `batch1+2-full.patch`（含 _backup 快照）
- 本地依赖库（已 vendor，离线、不走 CDN）：`gantang-grid-designer/vendor/`
  - jspdf 2.5.1 (MIT)、pdf.js 3.11.174 (Apache-2.0) + pdf.worker.min.js、dxf 5.3.1 (MIT)

## 2. 环境与运行/验收

- **Node 不在 PATH**：用 `/opt/homebrew/bin/node`（v26）。`export PATH="/opt/homebrew/bin:$PATH"`。
- **语法/结构验收**：`cd 仓库根 && npm test`（= `node scripts/check-inline.js`，零依赖：校验所有内联 `<script>` 语法 + `manifest.json` 解析）。
- **本地预览**：`python3 -m http.server 8767 --bind 127.0.0.1 --directory <仓库根>`，开 `http://127.0.0.1:8767/gantang-grid-designer/gantang-grid-designer.html`。
- **DWG→DXF（已装）**：`dwg2dxf`（brew `libredwg`，免费但有损）。生产保真用 **ODA File Converter**（dmg 在用户 iCloud：`.../CODEX/imported-from-Documents-Codex/2026-05-30/new-chat-2/tools/oda-download/`）。
- **真实测试数据**：`/Users/yy/Desktop/cad 实测/`（9 个 DWG + `图片/` 5 张 PNG 截图 + `dxf/` 已转 DXF）。
- **CJK 路径坑**：zsh `for f in $(ls ...)` 会按空格切分中文路径 → 用 `cd` 进目录后用 glob `for f in *.dxf`。

## 3. 导航图（关键函数 — 行号会漂移，用 `grep -n "function X"` 定位）

| 区域 | 函数 |
|---|---|
| 交付门禁 | `validateProjectForDelivery`(~2426)，含 hole 几何门禁 |
| 比例尺 | `onScaleUnitChange`(~2630)、`applyScaleRuler`、`applyAreaCalibration`、`syncInputs` |
| iframe 桥 | `handleHostBridgeMessage`(~2953)、`window.GantangGridDesigner` |
| 几何 | `polygonInsideFraction`(~3505)、`polygonsRealOverlap`(~3521)、`pointInPolygon`、`clipPolygonToRect` |
| 障碍识别 | `detectObstacleByTemplate`(~3646, NCC 模板匹配)、`detectObstacleCandidates`(~3766, 颜色阈值)、`confirmObstacleCandidate`、`confirmObstacleCandidatesByConfidence` |
| 算量 | `buildCells`(~6806)、`buildTakeoffSummary`(~5912)、`buildTakeoffByMaterial`、`buildQuote`(~5782) |
| 项目管理 | `saveCurrentProjectPrompt`(~6192)、`loadSelectedProject`、`applyProjectData`(~6425) |
| 导入 | `importDrawing`、`importPdfDrawing`(~6308)、`importDxfDrawing`(~6340)、`applyImportedImage`、`showUnsupportedDrawingFormatNotice` |
| 输出 | `exportProjectData`、`exportProjectSummary`、`exportCSV`、`exportCutSVG`、`printReport`、`downloadReportPDF` |
| 交互 | canvas `pointerdown/move`、`onPointerEnd`、长按删点 `scheduleTouchLongPress` |

## 4. 已完成（10 项 + 复核修复，均浏览器实测 console error=0）

批次一（P0/P1）：DEBUG 仅认 `?debug=1`（不再因目录名开启）；漏检 warning `obstacle_candidates_all_ignored`；`npm test` 可运行验收；候选→洞多边形校验；ignored 候选裁剪(200)；打印空白页兜底 `#printFallbackNotice`；`image.crossOrigin` + getImageData/toDataURL 兜底；`emitHostChange` 统一刷门禁面板。

批次二（功能）：#11 算量金标准对照（矩形/扣洞数值精确，已验证）；#10 比例尺单位(m/cm/mm/in)+面积反推+一致性提示；#7 localStorage 多项目；#8 一键 PDF(jsPDF)；#5 PDF/DXF 浏览器内导入(PDF.js+dxf, 离线)；#4 模板匹配 NCC + 按置信度批量确认；#6 报价 `gantang-quote.v1`（进 export，供宿主）；#9 分区多材料（已存在，验证）。

独立复核修复（v1.2.1/1.2.2）：**P0 报价/候选 XSS**（改 `data-` 属性 + `escapeHtml`）；hole 门禁改**面积占比**（`polygonInsideFraction` 0.95）+ **真实重叠面积**（`polygonsRealOverlap`，共边不算）；单位切换调 `syncInputs`（修 100× 比例错误）；报价/`lengthUnit` round-trip；PDF/DXF 解码地板不破 4000px 上限；DWG 选择 → 提示「转 DXF 或 PDF」（`accept` 含 `.dwg`）。

## 5. 真实数据实测结论（重要 — 决定下一步）

- **导入/算量/门禁/导出/iframe/触屏在真实图上 OK**；金标准数值精确。
- **自动识别（柱/树）在真实 CAD 上几乎失效**：
  - 颜色阈值：真实树是黄色细线星状符号 → `greenMatch` 不命中 → **0 召回**。
  - 模板匹配 NCC：相邻树 patch NCC≈0（符号非像素级重复/有旋转）→ **≈0 召回**。
  - → 结论：**栅格启发式不可靠；可靠路线是解析 DXF 的 INSERT 块**拿精确符号坐标（真实图里块数 71~7132，可行）。
- **DWG→DXF(LibreDWG)→导入**：9 个里 **5 个渲染成功、4 个失败**（2 截断无范围、1 无范围、11MB 解析抛错），且 dxf 库对匿名块刷 **500 条非致命 `console.error`**（保真不全）。**生产应改用 ODA 转干净 DXF**。导入无自动比例（`insUnits` 未保留）→ 需人工标定。

## 6. 未验证 / 边界（诚实）

- 识别召回/精确率：仅合成 ground-truth 验过（9/9）；真实样本上两种方法都差（见 §5）。
- 真实 iPad/Safari 触摸未在真机验。
- 真实宿主 BOM/报价系统未接入（设计器侧只出 `gantang-quote.v1` 数据）。
- 11MB 级 DXF 在浏览器内解析慢/会抛错；复杂 DXF 最慢见 ~20s。
- 拼花（单区多材料图案）未做。
- PR #1 已开、待终审、未合并、未上线。

## 7. 建议下一步（按优先级）

1. **识别内核换路线**：放弃纯栅格，做 **DXF 块(INSERT)解析**识别柱/树（解析时已有 dxf 库，块数据可取）；这是真实图唯一可靠路径。
2. **DXF 导入健壮性**：① 用 ODA 出干净 DXF；② 抑制 dxf 库 `console.error` 噪声（导入时临时包 `console.error`，免触发 console=0 门禁）；③ 大文件解析放 Web Worker，避免主线程卡死/抛错。
3. **P2 收尾**：`activeProjectId` 会话恢复（故意未做，见复核备注）；合并前按真实样本补一次召回抽检和人评终审。
4. **真机/真宿主验证**：iPad Safari 触屏；宿主消费 `export-summary`/`get-project`/`gantang-quote.v1` 出报价。
5. **发布前**：PR #1 已开；按本轮 reviewer 意见补齐后，人评终审通过再合并。

## 8. 改动纪律（沿用）

- 改前备份到 `_backup/gantang-grid-designer-vYYYYMMDD-HHMM-before-<topic>.html`。
- bump `manifest.json` version/featureVersion；`MANIFEST.md` 追加 changelog 段（同现有格式）；刷新 `MANIFEST.md` 的 SHA-256 块（不含 MANIFEST.md 自身、不含 _backup）。
- inline JS 必须过 `npm test`；浏览器实测目标 console error=0。
- 最小手术，别整体重排单文件。

## 9. 已知坑

- **DEBUG_MODE** 仅 `?debug=1|true`（已修复目录名触发）。非 debug 隐藏实时 JSON 与内置测试图纸。
- **headless 后台标签页 rAF 被挂起** → PDF.js `page.render` 会卡（真前台浏览器正常，非代码缺陷）。验证 PDF 渲染要么用真前台浏览器，要么临时 `requestAnimationFrame=cb=>setTimeout(cb,0)`。
- **`escapeJsString` 不转义 `"`/`<`/`>`** → 别用它往 HTML 属性里塞外部可控值；用 `data-` 属性 + `escapeHtml`（XSS 已按此修）。
- 交付门禁会在每次 `renderAll`/`emitHostChange` 现算（含 hole 几何采样）；几百个洞时注意性能。
- `_backup/` 三份大 HTML 是历史回退点，不进 SHA 清单。
