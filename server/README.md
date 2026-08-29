# NyayaSetu API

Base URL: `http://localhost:5000/api/v1`

## 1) GET /problems

- Method: `GET`
- Path: `/api/v1/problems`

### Sample request

```http
GET /api/v1/problems
GET /api/v1/problems?q=water
```

### Sample response

```json
{
  "ok": true,
  "count": 2,
  "data": [
    {
      "id": "water-supply",
      "slug": "water-supply",
      "title": "Water Supply Issue",
      "category": "Utility",
      "summary": "Problems related to water pipeline, supply, or leakage issues.",
      "keywords": "water, leakage, pipe, supply",
      "routeId": "municipal-water-supply"
    }
  ]
}
```

## 2) GET /routes/:id

- Method: `GET`
- Path: `/api/v1/routes/:id`

### Sample request

```http
GET /api/v1/routes/municipal-water-supply
```

### Sample response

```json
{
  "ok": true,
  "data": {
    "id": "municipal-water-supply",
    "authorityName": "Municipal Corporation",
    "portalName": "Citizen Service Portal",
    "portalUrl": "https://example.gov.in/portal",
    "helpline": "1800-123-4567",
    "department": "Water Supply Department",
    "checklist": ["Address proof", "Photo of issue"],
    "steps": ["Register complaint", "Upload supporting docs"],
    "draftTemplate": "Subject: {{issueType}}\n\nDear Sir/Madam,...",
    "questions": [
      {
        "id": "q1",
        "routeId": "municipal-water-supply",
        "sortOrder": 1,
        "prompt": "What is the issue type?",
        "questionKey": "issueType",
        "options": ["Leakage", "No water supply", "Quality issue"]
      }
    ],
    "problems": [
      {
        "id": "water-supply",
        "title": "Water Supply Issue",
        "category": "Utility",
        "summary": "Problems related to water pipeline, supply, or leakage issues.",
        "keywords": "water, leakage, pipe, supply",
        "routeId": "municipal-water-supply"
      }
    ]
  }
}
```

## 3) POST /drafts

- Method: `POST`
- Path: `/api/v1/drafts`

### Sample request body

```json
{
  "routeId": "municipal-water-supply",
  "answers": {
    "complainantName": "Asha Verma",
    "location": "Delhi",
    "issueType": "Water Supply",
    "description": "The pipeline near my home is leaking.",
    "reliefSought": "Immediate repair"
  }
}
```

### Sample response

```json
{
  "ok": true,
  "data": {
    "draft": "Subject: Citizen grievance — Water Supply\n\nTo,\nThe Concerned Authority\n\nRespected Sir/Madam,\n\nI am Asha Verma of Delhi.\n\nIssue: Water Supply\nDetails: The pipeline near my home is leaking.\n\nRelief sought: Immediate repair\n\nI will file this myself on the official government portal. NyayaSetu does not submit complaints on my behalf.\n\nThank you.\nAsha Verma",
    "disclaimer": "NyayaSetu is an independent guidance layer. It does not file this text on any government portal."
  }
}
```

## 4) GET /tracker

- Method: `GET`
- Path: `/api/v1/tracker`

### Sample request

```http
GET /api/v1/tracker
```

### Sample response

```json
{
  "ok": true,
  "count": 1,
  "data": [
    {
      "id": 1,
      "title": "Water complaint",
      "category": "Utility",
      "referenceId": "REF-1001",
      "filingDate": "2026-08-29",
      "status": "drafted",
      "notes": "Follow up with municipal office",
      "portalUrl": "https://example.gov.in/portal",
      "createdAt": "2026-08-29T12:00:00.000Z"
    }
  ]
}
```

## 5) POST /tracker

- Method: `POST`
- Path: `/api/v1/tracker`

### Sample request body

```json
{
  "title": "Water complaint",
  "category": "Utility",
  "referenceId": "REF-1001",
  "filingDate": "2026-08-29",
  "status": "drafted",
  "notes": "Follow up with municipal office",
  "portalUrl": "https://example.gov.in/portal"
}
```

### Sample response

```json
{
  "ok": true,
  "data": {
    "id": 1,
    "title": "Water complaint",
    "category": "Utility",
    "referenceId": "REF-1001",
    "filingDate": "2026-08-29",
    "status": "drafted",
    "notes": "Follow up with municipal office",
    "portalUrl": "https://example.gov.in/portal",
    "createdAt": "2026-08-29T12:00:00.000Z"
  }
}
```
