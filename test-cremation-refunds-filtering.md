# Cremation Refunds Filtering Test

## Overview
This document outlines the testing approach to verify that cremation centers can only see refunds for their own bookings.

## Test Scenarios

### 1. Cremation Center A - Should Only See Their Refunds
- **Setup**: Cremation Center A (ID: 1) has bookings with IDs: 101, 102, 103
- **Expected**: Only refunds for booking IDs 101, 102, 103 should be visible
- **API Endpoint**: `GET /api/cremation/refunds`
- **Authentication**: Cremation Center A token

### 2. Cremation Center B - Should Only See Their Refunds  
- **Setup**: Cremation Center B (ID: 2) has bookings with IDs: 201, 202, 203
- **Expected**: Only refunds for booking IDs 201, 202, 203 should be visible
- **API Endpoint**: `GET /api/cremation/refunds`
- **Authentication**: Cremation Center B token

### 3. Cross-Center Access Prevention
- **Test**: Cremation Center A tries to approve/deny refund from Center B
- **Expected**: 404 Not Found or 403 Forbidden
- **API Endpoints**: 
  - `POST /api/cremation/refunds/{refund_id}/approve`
  - `POST /api/cremation/refunds/{refund_id}/deny`

## Key Security Measures Implemented

### Database Query Filtering
All cremation refund queries include:
```sql
WHERE cb.cremation_center_id = ?
```

### Authentication Checks
1. Verify cremation center authentication
2. Extract cremation_center_id from user session
3. Filter all queries by cremation_center_id

### API Endpoints Protected
- `GET /api/cremation/refunds` - Lists only center's refunds
- `POST /api/cremation/refunds/[id]/approve` - Only allows center's refunds
- `POST /api/cremation/refunds/[id]/deny` - Only allows center's refunds

## Migration from Admin to Cremation Centers

### Removed Components
- ❌ `/admin/refunds` page
- ❌ `/api/admin/refunds/*` routes
- ❌ Admin navigation refund links
- ❌ Admin refund management UI

### Added Components  
- ✅ `/cremation/refunds` page
- ✅ `/api/cremation/refunds/*` routes
- ✅ Cremation navigation refund links
- ✅ Cremation-specific refund UI

### Updated Notifications
- Admin notifications for refunds now have no link (handled by cremation centers)
- User-facing messages updated to mention "service provider" instead of "admin"

## Verification Checklist
- [ ] Cremation centers can only see their own refunds
- [ ] Cremation centers cannot access other centers' refunds
- [ ] Admin refund pages/routes are completely removed
- [ ] Navigation updated in both admin and cremation dashboards
- [ ] User-facing messages updated appropriately
- [ ] Database queries properly filter by cremation_center_id