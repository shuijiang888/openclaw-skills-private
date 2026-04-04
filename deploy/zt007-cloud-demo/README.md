# ZhiTan007 Cloud Demo Bundle

This folder contains a standalone cloud-demo package for publishing to a plain Nginx server root.

## What is included
- `index.html`: Single-entry, systemized demo UI
- `assets/style.css`: Responsive UI styles (desktop / tablet / mobile)
- `assets/app.js`: Interactive logic (role switch, action completion, submissions, redemption)

## Publish to Tencent Cloud Nginx server

Run these commands on your cloud server:

```bash
mkdir -p /usr/share/nginx/html/assets
```

Then upload/sync the bundle from local repo to server:

```bash
scp -r deploy/zt007-cloud-demo/* root@119.45.205.137:/usr/share/nginx/html/
```

Or on server, if code exists there:

```bash
cp -rf /path/to/repo/deploy/zt007-cloud-demo/* /usr/share/nginx/html/
```

Reload Nginx:

```bash
nginx -t && systemctl reload nginx
```

Verify:

```bash
curl -I http://127.0.0.1/
curl -I http://119.45.205.137/
```

Open in browser:
- `http://119.45.205.137/`

