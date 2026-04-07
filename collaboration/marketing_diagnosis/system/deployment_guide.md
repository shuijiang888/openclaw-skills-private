## 医疗器械营销能力诊断 H5 部署指南

### 发布物

- 主文件：`collaboration/marketing_diagnosis/medical_device/h5_medical.html`
- 类型：单文件静态页（HTML + 内联 CSS/JS）
- 依赖 CDN：`https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js`

> 禁止将整份 HTML 做 base64 后上传。必须是明文 UTF-8 HTML（首字节应为 `<`）。

### 推荐线上路径

- `https://<your-host>/diag/h5_medical.html`

### 服务器侧要求

- Nginx `location /diag/` 指向静态目录（如 `/opt/marketing-diag/static/`）
- 响应头要求：
  - `Content-Type: text/html; charset=utf-8`
  - `ETag` / `Last-Modified` 可见

### 发布步骤

1. 从仓库获取最新文件：`collaboration/marketing_diagnosis/medical_device/h5_medical.html`
2. 上传覆盖线上同名文件：`/opt/marketing-diag/static/h5_medical.html`
3. 验证：
   - `curl -I https://<host>/diag/h5_medical.html`
   - `curl -s https://<host>/diag/h5_medical.html | sed -n '1,3p'`
4. 如有 CDN，请按路径执行缓存刷新

### 验收关键点

- 欢迎页出现“10 题轻诊断”
- 完成第 10 题后进入“查看初估画像”
- 点击“继续完成完整版”后显示 `x/30`
- localStorage 键：`diag_medical_v1`
- 报告展示 `Q_B2` 细分赛道
- 预约按钮先确认弹窗，再打开 `CONFIG.bookingUrl`
