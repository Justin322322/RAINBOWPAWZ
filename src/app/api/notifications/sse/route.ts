import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';

// Store active SSE connections
const sseConnections = new Map<string, ReadableStreamDefaultController>();

/**
 * GET - Server-Sent Events endpoint for real-time notifications_unified
 */
export async function GET(request: NextRequest) {
  try {
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create unique connection ID
    const connectionId = `${user.userId}_${user.accountType}_${Date.now()}`;

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Store connection for broadcasting
        sseConnections.set(connectionId, controller);

        // Send initial connection confirmation
        controller.enqueue(`data: ${JSON.stringify({
          type: 'connection',
          message: 'Connected to real-time notifications_unified',
          timestamp: new Date().toISOString()
        })}\n\n`);

        // Send keep-alive every 30 seconds
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(`data: ${JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString()
            })}\n\n`);
          } catch {
            console.log('Keep-alive failed, connection closed:', connectionId);
            clearInterval(keepAlive);
            sseConnections.delete(connectionId);
          }
        }, 30000);

        // Clean up on connection close
        request.signal.addEventListener('abort', () => {
          clearInterval(keepAlive);
          sseConnections.delete(connectionId);
          console.log('SSE connection closed:', connectionId);
        });
      },
      cancel() {
        sseConnections.delete(connectionId);
        console.log('SSE connection cancelled:', connectionId);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('SSE endpoint error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Broadcast notification to specific user
 */
export function broadcastToUser(userId: string, accountType: string, notification: any) {
  const userConnections = Array.from(sseConnections.entries()).filter(([connId]) => {
    return connId.startsWith(`${userId}_${accountType}_`);
  });

  userConnections.forEach(([connId, controller]) => {
    try {
      controller.enqueue(`data: ${JSON.stringify({
        type: 'notification',
        notification,
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch {
      console.log('Failed to send notification via SSE, removing connection:', connId);
      sseConnections.delete(connId);
    }
  });
}

/**
 * Broadcast to all connected users
 */
export function broadcastToAll(notification: any) {
  Array.from(sseConnections.entries()).forEach(([connId, controller]) => {
    try {
      controller.enqueue(`data: ${JSON.stringify({
        type: 'system_notification',
        notification,
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch {
      console.log('Failed to send system notification via SSE, removing connection:', connId);
      sseConnections.delete(connId);
    }
  });
}

/**
 * Get active connections count
 */
export function getActiveConnections() {
  return sseConnections.size;
} 
