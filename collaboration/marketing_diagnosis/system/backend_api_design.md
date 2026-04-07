# 医疗器械营销能力诊断 H5：后端/外部依赖说明

## 1) 页面类型

- `h5_medical.html` 为单文件静态页（HTML + 内联 CSS/JS），无需后端渲染。
- 题目状态保存依赖浏览器 `localStorage`：
  - 键名：`diag_medical_v1`
  - 生成报告后会自动清理该键。

## 2) 外部依赖

- PDF 导出依赖：
  - `https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js`
- 当 CDN 不可达时，页面会给出前端提示，不会导致整页崩溃。

## 3) 预约链路

- 页面通过前端配置 `CONFIG.bookingUrl` 打开预约落地页。
- 点击“预约专家”时会先弹出二次确认，再 `window.open()` 跳转。

## 4) 无后端接口约束

- 当前版本无强依赖业务后端 API。
- 仅需保证静态资源可访问、Content-Type 正确、HTTPS 与门户一致（如有）。
