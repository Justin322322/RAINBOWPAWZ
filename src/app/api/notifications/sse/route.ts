import { NextRequest } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';

// Using Node.js runtime for JWT authentication compatibility
// Edge runtime doesn't support Node.js crypto and stream modules required by jsonwebtoken

// Active SSE connections
const sseConnections = new Map<string, ReadableStreamDefaultController<Uint8Array>>();

/**
 * GET - Server-Sent Events endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifySecureAuth(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const connectionId = `${user.userId}_${user.accountType}_${Date.now()}`;
    const encoder = new TextEncoder();

    let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
    let keepAlive: NodeJS.Timeout;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controllerRef = controller;
        sseConnections.set(connectionId, controller);

        // Initial connection message
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'connection',
              message: 'Connected to real-time notifications',
              timestamp: new Date().toISOString(),
            })}\n\n`
          )
        );

        // Keep-alive pings
        keepAlive = setInterval(() => {
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'ping',
                  timestamp: new Date().toISOString(),
                })}\n\n`
              )
            );
          } catch {
            clearInterval(keepAlive);
            sseConnections.delete(connectionId);
          }
        }, 30000);
      },
      cancel(reason) {
        if (keepAlive) clearInterval(keepAlive);
        if (controllerRef) {
          sseConnections.delete(connectionId);
        }
        console.log('SSE connection closed:', connectionId, 'reason:', reason);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('SSE endpoint error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Broadcast to specific user
 */
export function broadcastToUser(
  userId: string,
  accountType: string,
  notification: any
) {
  const encoder = new TextEncoder();

  const userConnections = Array.from(sseConnections.entries()).filter(
    ([connId]) => connId.startsWith(`${userId}_${accountType}_`)
  );

  for (const [connId, controller] of userConnections) {
    try {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'notification',
            notification,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );
    } catch {
      console.log(
        'Failed to send notification via SSE, removing connection:',
        connId
      );
      sseConnections.delete(connId);
    }
  }
}

/**
 * Broadcast to all
 */
export function broadcastToAll(notification: any) {
  const encoder = new TextEncoder();

  for (const [connId, controller] of sseConnections.entries()) {
    try {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'system_notification',
            notification,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );
    } catch {
      console.log(
        'Failed to send system notification via SSE, removing connection:',
        connId
      );
      sseConnections.delete(connId);
    }
  }
}

/**
 * Active connections count
 */
export function getActiveConnections() {
  return sseConnections.size;
}
