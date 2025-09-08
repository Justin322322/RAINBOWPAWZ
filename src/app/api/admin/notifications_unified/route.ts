import { NextRequest } from 'next/server';
import * as adminNotificationsHandlers from '../notifications/route';

// Alias /api/admin/notifications_unified to existing /api/admin/notifications handlers

export async function GET(request: NextRequest) {
  return (adminNotificationsHandlers as any).GET(request);
}

export async function PATCH(request: NextRequest) {
  return (adminNotificationsHandlers as any).PATCH(request);
}

export async function POST(request: NextRequest) {
  return (adminNotificationsHandlers as any).POST(request);
}


