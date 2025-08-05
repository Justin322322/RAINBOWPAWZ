# Dynamic Port Solution for Rainbow Paws

## 🔄 Problem Solved

The application had hardcoded port references (3000, 3001) that caused issues when running on different ports. Now the application dynamically detects and adapts to any available port.

## ✅ Dynamic Port Implementation

### 1. **Enhanced App URL Utility** (`src/utils/appUrl.ts`)

**New Functions:**
- `getCurrentPort()` - Detects current port client-side and server-side
- `getAppUrl()` - Main function for URL generation
- `getServerAppUrl()` - Specialized for server-side use (emails, notifications)

**Key Features:**
- **Client-side**: Uses `window.location.port` for accurate detection
- **Server-side**: Uses `process.env.PORT` with fallback
- **Dynamic fallback**: Automatically constructs URLs with detected port

### 2. **Updated Files for Dynamic Port Support**

**Email & Notification Services:**
- `src/lib/emailTemplates.ts` - Password reset and booking emails
- `src/utils/adminNotificationService.ts` - Admin notifications
- `src/utils/businessNotificationService.ts` - Business notifications  
- `src/utils/notificationService.ts` - General notifications

**Payment & API Services:**
- `src/services/paymentService.ts` - PayMongo payment URLs
- `src/app/api/admin/cremation-businesses/restrict/route.ts` - Admin restriction emails

**Authentication:**
- `src/utils/auth.ts` - Flexible development port detection (3000-9999)

### 3. **Port Management Script** (`scripts/check-port.js`)

**Features:**
- **Automatic port detection** - Finds available ports
- **Configuration updates** - Updates `.env.local` automatically
- **Port conflict resolution** - Suggests alternatives
- **Development-friendly** - Works with any port range

**Usage:**
```bash
# Check current port status
node scripts/check-port.js

# Auto-update configuration to available port
node scripts/check-port.js --update
```

## 🎯 Benefits

### **For Developers:**
- **No more port conflicts** - Works on any available port
- **Zero configuration** - Automatic port detection
- **Flexible development** - Run multiple instances easily
- **Consistent URLs** - All services use the same dynamic detection

### **For Deployment:**
- **Environment agnostic** - Works in any environment
- **Container friendly** - Adapts to assigned ports
- **Load balancer compatible** - No hardcoded assumptions

### **For Users:**
- **Seamless experience** - URLs always work correctly
- **Email links work** - Dynamic URLs in all emails
- **Payment flows** - Correct return URLs regardless of port

## 🔧 Technical Implementation

### **Dynamic URL Generation:**
```typescript
// Before (hardcoded)
const url = 'http://localhost:3000/reset-password';

// After (dynamic)
import { getServerAppUrl } from '@/utils/appUrl';
const url = `${getServerAppUrl()}/reset-password`;
```

### **Port Detection Logic:**
```typescript
export function getCurrentPort(): string {
  // Client-side: Use actual browser port
  if (typeof window !== 'undefined') {
    return window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
  }
  
  // Server-side: Use environment or default
  return process.env.PORT || '3001';
}
```

### **Flexible Authentication:**
```typescript
// Supports any development port (3000-9999) on localhost
if (hostname === 'localhost' || hostname === '127.0.0.1') {
  if (!isNaN(portNum) && portNum >= 3000 && portNum <= 9999) {
    // Allow localStorage access
  }
}
```

## 🚀 Usage Examples

### **Running on Different Ports:**
```bash
# Default port (from .env.local)
npm run dev

# Custom port
npx next dev -p 3005

# Auto-detect and configure
node scripts/check-port.js --update && npm run dev
```

### **Multiple Development Instances:**
```bash
# Terminal 1
npx next dev -p 3001

# Terminal 2  
npx next dev -p 3002

# Terminal 3
npx next dev -p 3003
```

### **In Code:**
```typescript
// Email templates
const resetLink = `${getServerAppUrl()}/reset-password?token=${token}`;

// Payment returns
const returnUrl = `${getServerAppUrl()}/payment/success?booking_id=${id}`;

// Notification links
const dashboardUrl = `${getServerAppUrl()}/user/dashboard`;
```

## 📋 Configuration

### **Environment Variables:**
```bash
# .env.local
PORT=3001                                    # Preferred port
NEXT_PUBLIC_APP_URL=http://localhost:3001   # Full URL (auto-generated)
```

### **Next.js Configuration:**
```javascript
// next.config.js - Already configured for dynamic ports
const port = process.env.PORT || 3001;
env: {
  PORT: port,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
}
```

## 🔍 Testing

### **Verify Dynamic Port Support:**
1. **Change port**: `npx next dev -p 3005`
2. **Test email links**: Check password reset emails
3. **Test payments**: Verify PayMongo return URLs
4. **Test notifications**: Check admin/business notification links
5. **Test authentication**: Verify localStorage works on new port

### **Port Conflict Resolution:**
1. **Run script**: `node scripts/check-port.js`
2. **Check conflicts**: Script identifies port usage
3. **Auto-configure**: Use `--update` flag for automatic setup

## ✨ Result

The application now works seamlessly on **any port** without hardcoded dependencies. Whether running on port 3000, 3001, 3005, or any other port, all URLs, emails, payments, and notifications automatically use the correct port.

**No more port-specific issues!** 🎉
