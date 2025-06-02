# Refund System Business Logic & Implementation

## 🎯 **Corrected Business Logic Overview**

The refund system has been updated to implement proper business logic with clear role separation and admin oversight.

### **Key Changes Made:**

1. **❌ REMOVED: Direct User Refund Processing**
2. **✅ ADDED: Request-Based Approval Workflow**
3. **✅ ADDED: Admin Notification System**
4. **✅ ADDED: Proper Role-Based Access Control**

---

## 🔄 **New Refund Workflow**

### **For Fur Parents (Users):**

#### **1. Refund Request Submission**
- **Visibility**: Refund button only appears for **cancelled paid bookings**
- **Action**: Users can **REQUEST** refunds (not process them)
- **Button Text**: "Request Refund" (changed from "Refund")
- **Process**:
  - User cancels a paid booking
  - "Request Refund" button becomes visible
  - User clicks "Request Refund" button
  - Modal opens with refund request form
  - User selects reason and adds notes
  - Submits request with "Submit Request" button

#### **2. Request Status**
- **Initial Status**: `pending` (awaiting admin review)
- **User Notification**: "Refund request submitted successfully. Our team will review your request and process it within 1-2 business days."
- **Email Sent**: Confirmation email with request details

#### **3. Booking Cancellation**
- **Automatic Refund Requests**: When users cancel paid bookings, refund requests are automatically created (not processed)
- **Status**: `pending` (requires admin approval)
- **Admin Notification**: Automatic notification sent to admin dashboard

---

### **For Admins:**

#### **1. Refund Request Management**
- **Dashboard**: `/admin/refunds` - Complete refund management interface
- **Pending Requests**: Clear visibility of all pending refund requests
- **Action Buttons**:
  - ✅ **Approve** - Process the refund
  - ❌ **Deny** - Reject the refund request

#### **2. Admin Notifications**
- **Automatic Alerts**: Admins receive notifications for:
  - New refund requests from users
  - Refund requests from booking cancellations
- **Notification Content**: Booking details, customer info, refund amount

#### **3. Refund Processing**
- **Approve Action**:
  - For GCash payments: Processes PayMongo refund (5-10 business days)
  - For cash payments: Marks as processed immediately
  - Sends approval email to customer
  - Updates status to `processing` or `processed`

- **Deny Action**:
  - Updates status to `cancelled` (displayed as "Denied")
  - Sends denial email to customer with explanation
  - No refund processing occurs

---

## 📊 **Refund Status Flow**

```
User Request → pending → Admin Review → approved/denied
                ↓                           ↓
        Admin Notification            processing/cancelled
                                           ↓
                                    processed/denied
```

### **Status Definitions:**
- **`pending`**: "Pending Review" - Awaiting admin decision
- **`processing`**: "Processing" - Approved, refund in progress (PayMongo)
- **`processed`**: "Completed" - Refund successfully completed
- **`cancelled`**: "Denied" - Request denied by admin
- **`failed`**: "Failed" - Technical failure during processing

---

## 🔐 **Access Control & Permissions**

### **User Permissions:**
- ✅ **Can**: Submit refund requests (only for cancelled paid bookings)
- ✅ **Can**: View refund status
- ✅ **Can**: Cancel bookings (creates automatic refund request)
- ✅ **Can**: See refund button only after booking cancellation
- ❌ **Cannot**: Process refunds directly
- ❌ **Cannot**: Approve/deny refunds
- ❌ **Cannot**: Access admin refund management
- ❌ **Cannot**: See refund button on active/pending bookings

### **Admin Permissions:**
- ✅ **Can**: View all refund requests
- ✅ **Can**: Approve refund requests
- ✅ **Can**: Deny refund requests
- ✅ **Can**: Process refunds manually
- ✅ **Can**: View detailed refund information
- ✅ **Can**: Receive refund notifications

---

## 📧 **Email Notification System**

### **User Emails:**
1. **Request Confirmation**: Sent when refund request is submitted
2. **Approval Notification**: Sent when admin approves request
3. **Denial Notification**: Sent when admin denies request
4. **Completion Notification**: Sent when refund is processed

### **Admin Notifications:**
1. **Dashboard Alerts**: Real-time notifications for new requests
2. **Request Details**: Booking info, customer details, refund amount

---

## 🛠 **Technical Implementation**

### **API Endpoints:**

#### **User Endpoints:**
- `POST /api/bookings/[id]/refund` - Submit refund request
- `GET /api/bookings/[id]/refund` - Check refund eligibility

#### **Admin Endpoints:**
- `GET /api/admin/refunds` - List all refunds with filtering
- `POST /api/admin/refunds/[id]/approve` - Approve refund request
- `POST /api/admin/refunds/[id]/deny` - Deny refund request

### **Database Changes:**
- **Refunds Table**: Tracks all refund requests and their status
- **Admin Notifications**: Automatic notifications for new requests
- **Booking Updates**: Links bookings to refund records

### **Component Updates:**
- **RefundButton**: Changed to "Request Refund" with proper messaging
- **RefundRequestModal**: Updated to reflect request submission process
- **Admin Dashboard**: Added approve/deny buttons for pending requests

---

## ✅ **Benefits of New System**

1. **🔒 Proper Access Control**: Clear separation between user requests and admin processing
2. **📋 Admin Oversight**: All refunds require admin review and approval
3. **📊 Better Tracking**: Complete audit trail of refund requests and decisions
4. **🔔 Notification System**: Admins are immediately alerted to new requests
5. **📧 Professional Communication**: Proper email notifications for all parties
6. **⚖️ Business Control**: Admins can deny inappropriate refund requests
7. **🛡️ Fraud Prevention**: Manual review prevents automated refund abuse

---

## 🎯 **Summary**

The refund system now implements proper business logic where:
- **Users REQUEST refunds** (they don't process them)
- **Admins REVIEW and PROCESS refunds** (with full oversight)
- **All refunds require admin approval** (no automatic processing)
- **Complete notification system** (keeps everyone informed)
- **Proper role-based access control** (security and compliance)

This ensures that the business maintains control over refund decisions while providing a smooth experience for customers who need legitimate refunds.
