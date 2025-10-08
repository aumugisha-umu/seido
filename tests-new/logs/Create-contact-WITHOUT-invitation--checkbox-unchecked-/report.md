# Test Report: Create contact WITHOUT invitation (checkbox unchecked)

## Summary

- **Status**: ✅ PASSED
- **Duration**: 18766ms
- **Healing Attempts**: 0


## Statistics

- **Total Logs**: 68
- **Errors**: 2
- **Network Requests**: 35
- **Network Errors**: 1

## Errors

### 2025-10-04T12:39:26.157Z
```
Failed to load resource: the server responded with a status of 406 ()
```
**Metadata**:
```json
{
  "location": {
    "url": "https://yfmybfmflghwvylqjfbc.supabase.co/rest/v1/users?select=id&email=eq.test-locataire-1759581551695%40seido-test.com&limit=1",
    "lineNumber": 0,
    "columnNumber": 0
  }
}
```

### 2025-10-04T12:39:27.896Z
```
[DASHBOARD-CLIENT] Contact creation failed: Erreur lors de la création du contact
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

### GET https://yfmybfmflghwvylqjfbc.supabase.co/rest/v1/users?select=id&email=eq.test-locataire-1759581551695%40seido-test.com&limit=1
- **Status**: 406
- **Duration**: 108ms
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
