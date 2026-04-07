# 通用行业营销诊断 API 示例（v1）

> 目的：给小江 / Agent1 快速对齐前后端请求响应字段，不绑定具体后端框架。

## 1) POST `/v1/submissions`

### Request (example)

```json
{
  "industryEdition": "energy",
  "questionnaireVersion": "energy_v1",
  "scoringModelVersion": "score_v1_9",
  "sourcePage": "/diag/h5_energy.html",
  "clientSubmissionId": "web_20260407_abc123",
  "qbPayload": {
    "q_b1_companyName": "华南某新能源公司",
    "q_b2_segments": ["storage", "pv_wind", "epc"],
    "q_b3_scale": "500-2000人",
    "q_b4_years": "10-20年"
  },
  "answersPayload": {
    "M1_Q1": ["a"],
    "M1_Q2": ["b"],
    "M1_Q3": ["a", "b"],
    "M1_Q4": "b"
  },
  "clientScorePayload": {
    "weighted": [18.5, 16.0, 14.0, 15.0],
    "total": 63.5,
    "level": "一般"
  },
  "meta": {
    "userAgent": "Mozilla/5.0 ...",
    "clientIp": "x.x.x.x",
    "portalReferrer": "https://portal.xxx.com/profit/"
  }
}
```

### Response 200 (example)

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "submissionId": "01HRY4SFH2FKM7EP9M7DG8H44A",
    "industryEdition": "energy",
    "questionnaireVersion": "energy_v1",
    "scoringModelVersion": "score_v1_9",
    "scorePayload": {
      "weighted": [19.0, 16.5, 14.0, 15.5],
      "total": 65.0,
      "level": "一般"
    },
    "reportPayload": {
      "top3": [
        "数字化能力",
        "经营与痛点治理",
        "转型与合作意向"
      ],
      "advice": "建议先打通项目经营数据，再推进标杆共建。"
    },
    "createdAt": "2026-04-07T11:30:00.000Z"
  }
}
```

---

## 2) GET `/v1/submissions/:id`

### Response 200 (example)

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "submissionId": "01HRY4SFH2FKM7EP9M7DG8H44A",
    "industryEdition": "medical_device",
    "questionnaireVersion": "medical_v2",
    "scoringModelVersion": "score_v1_9",
    "qbPayload": {
      "q_b1_companyName": "某医疗器械公司",
      "q_b2_segments": ["ivd", "device"],
      "q_b3_scale": "200-1000人",
      "q_b4_years": "10年以上"
    },
    "scorePayload": {
      "weighted": [14.0, 13.0, 12.5, 10.0, 9.5, 6.0],
      "total": 65.0,
      "level": "一般"
    },
    "reportPayload": {
      "top3": ["数字化应用", "组织协同", "销售推进"],
      "advice": "建议先补齐过程数据与跨部门协同机制。"
    },
    "status": "submitted",
    "createdAt": "2026-04-07T11:30:00.000Z"
  }
}
```

---

## 3) POST `/v1/leads`

### Request (example)

```json
{
  "submissionId": "01HRY4SFH2FKM7EP9M7DG8H44A",
  "name": "张三",
  "phone": "13800000000",
  "company": "某智能制造企业",
  "role": "营销负责人",
  "bookingIntent": true,
  "notes": "希望沟通渠道冲突治理方案"
}
```

### Response 200 (example)

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "leadId": "01HRY52CJQ6H00V5XZGMH3R1TN",
    "submissionId": "01HRY4SFH2FKM7EP9M7DG8H44A",
    "syncStatus": "pending",
    "createdAt": "2026-04-07T11:45:00.000Z"
  }
}
```

---

## 4) GET `/v1/stats`（可选）

### Request (query)

`/v1/stats?industryEdition=energy&from=2026-04-01&to=2026-04-07`

### Response 200 (example)

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "industryEdition": "energy",
    "submissionCount": 128,
    "avgScore": 63.4,
    "levelDistribution": {
      "卓越": 8,
      "良好": 35,
      "一般": 64,
      "薄弱": 21
    },
    "topSegments": [
      { "segment": "storage", "count": 59 },
      { "segment": "pv_wind", "count": 44 },
      { "segment": "epc", "count": 39 }
    ]
  }
}
```

---

## 5) 错误响应建议（统一）

```json
{
  "code": 40001,
  "message": "invalid questionnaire version",
  "requestId": "req_20260407_xxx"
}
```

建议错误码分层：
- `4xxxx`：参数/鉴权/业务规则
- `5xxxx`：服务或依赖异常

