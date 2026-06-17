# 异形场地模块独立调试包

复制日期：2026-06-15

来源模块：

- `/Users/yinyin/claude/安耐康球场设计/拼接工具/gantang-grid-designer`

调试入口：

- 顶层启动页：`index.html`
- 独立设计器：`gantang-grid-designer/gantang-grid-designer.html?image=import-batch/cad-screenshot-06.png`
- 宿主 iframe demo：`gantang-grid-designer/integration-host-demo.html`
- 集成说明：`gantang-grid-designer/gantang-grid-designer-integration.md`

包含能力：

- 异形铺装区域框选
- 扣除区域框选
- 两点比例尺标定和手动 m/px 设置
- 交付门禁：未校准、未闭合、自交、无有效格、底图缺失、超大格数会阻断正式 CSV / SVG / 打印 / 宿主正式项目
- 铺格、净面积、整格/裁切格算量
- 分材料 `takeoff.byMaterial` 汇总
- 项目 JSON 草稿/正式导出和 CSV 报表导出
- 裁切件 `cutId / orientation / polygonLocal` 明细和裁切 SVG 导出
- `gantang-project.v1` postMessage API，含 `export-summary` 轻量摘要

本地预览命令：

```bash
python3 -m http.server 8767 --bind 127.0.0.1 --directory /Users/yinyin/Documents/软件开发/outputs/irregular-field-debug-20260615
```

打开：

```text
http://127.0.0.1:8767/
```

边界说明：

- 这是独立复制包，不改主球场设计器 `拼接_fixed.html`。
- PDF / Word 仍需要先转 PNG 后再导入；当前页面直接支持 PNG / JPG / WEBP / SVG。
- 当前已改的是独立调试包；宿主生产 BOM/报价适配仍需在真实宿主项目里接入 `export-summary` 或正式 `get-project`。
- 本地预览只证明本机调试包可用，不代表已同步到测试环境或生产环境。
