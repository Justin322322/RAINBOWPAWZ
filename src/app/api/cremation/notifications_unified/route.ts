import { NextRequest } from 'next/server';
import * as notificationsHandlers from '../notifications/route';

// This file aliases /api/cremation/notifications_unified to the existing
// business notifications handlers in /api/cremation/notifications.
// Keeps frontend URL compatibility.

export async function GET(request: NextRequest) {
  // Delegate to existing notifications GET

  return notificationsHandlers.GET(request);
}

export async function PATCH(request: NextRequest) {
  // Delegate to existing notifications PATCH (mark read)
 
  return notificationsHandlers.PATCH(request);
}


