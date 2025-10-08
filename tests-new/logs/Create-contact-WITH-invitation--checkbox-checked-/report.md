# Test Report: Create contact WITH invitation (checkbox checked)

## Summary

- **Status**: ✅ PASSED
- **Duration**: 26308ms
- **Healing Attempts**: 0


## Statistics

- **Total Logs**: 60
- **Errors**: 3
- **Network Requests**: 43
- **Network Errors**: 1

## Errors

### 2025-10-05T15:11:01.459Z
```
Failed to load resource: the server responded with a status of 404 (Not Found)
```
**Metadata**:
```json
{
  "location": {
    "url": "http://localhost:3000/favicon.ico",
    "lineNumber": 0,
    "columnNumber": 0
  }
}
```

### 2025-10-05T15:11:11.360Z
```
Failed to load resource: the server responded with a status of 406 ()
```
**Metadata**:
```json
{
  "location": {
    "url": "https://yfmybfmflghwvylqjfbc.supabase.co/rest/v1/users?select=id&email=eq.test-locataire-1759677057780%40seido-test.com&limit=1",
    "lineNumber": 0,
    "columnNumber": 0
  }
}
```

### 2025-10-05T15:11:11.876Z
```
{time: 1759677071870, level: 50, msg: [DASHBOARD-CLIENT] Contact creation failed:}
```
**Metadata**:
```json
{
  "location": {
    "url": "webpack-internal:///(app-pages-browser)/./node_modules/next/dist/client/components/globals/intercept-console-error.js",
    "lineNumber": 49,
    "columnNumber": 31
  }
}
```


## Network Errors

### GET https://yfmybfmflghwvylqjfbc.supabase.co/rest/v1/users?select=id&email=eq.test-locataire-1759677057780%40seido-test.com&limit=1
- **Status**: 406
- **Duration**: 99ms
**Response**:
```json
{
  "code": "PGRST116",
  "details": "The result contains 0 rows",
  "hint": null,
  "message": "Cannot coerce the result to a single JSON object"
}
```


## Full Logs

See detailed logs in:
- [Console Logs](./console.log)
- [Server Logs](./server.log)
- [Supabase Logs](./supabase.log)
- [Pino Logs](./pino.log)
- [Network Logs](./network.log)
