import { NextRequest } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { createCORSHeaders, handleOptionsRequest, createCORSResponse } from '@/utils/cors';
import type { Notification } from '@/types/notification';

// Using Node.js runtime for JWT authentication compatibility
// Edge runtime doesn't support Node.js crypto and stream modules required by jsonwebtoken

// Constants for connection management
const MAX_CONNECTIONS_PER_USER = 5;
const CONNECTION_RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds
const MAX_CONNECTIONS_PER_WINDOW = 3;

// Active SSE connections and rate limiting
const sseConnections = new Map<string, ReadableStreamDefaultController<Uint8Array>>();
const connectionTimestamps = new Map<string, number[]>();

// Single TextEncoder instance for all SSE operations
const encoder = new TextEncoder();

/**
 * Helper functions for connection management
 */
function getUserPrefix(userId: string, accountType: string): string {
  return `${userId}_${accountType}_`;
}

function getActiveConnectionsForUser(userId: string, accountType: string): number {
  const userPrefix = getUserPrefix(userId, accountType);
  return Array.from(sseConnections.keys()).filter(connId => connId.startsWith(userPrefix)).length;
}

function checkRateLimit(userId: string, accountType: string): boolean {
  const userKey = `${userId}_${accountType}`;
  const now = Date.now();
  const timestamps = connectionTimestamps.get(userKey) || [];

  // Clean up old timestamps outside the window
  const validTimestamps = timestamps.filter(ts => now - ts < CONNECTION_RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_CONNECTIONS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }

  // Update timestamps
  validTimestamps.push(now);
  connectionTimestamps.set(userKey, validTimestamps);
  return true;
}

function removeOldestConnection(userId: string, accountType: string): boolean {
  const userPrefix = getUserPrefix(userId, accountType);
  const userConnections = Array.from(sseConnections.entries())
    .filter(([connId]) => connId.startsWith(userPrefix))
    .sort(([connIdA], [connIdB]) => {
      // Sort by timestamp in connectionId (format: userId_accountType_timestamp)
      const timestampA = parseInt(connIdA.split('_').pop() || '0');
      const timestampB = parseInt(connIdB.split('_').pop() || '0');
      return timestampA - timestampB;
    });

  if (userConnections.length === 0) return false;

  // Remove the oldest connection
  const [oldestConnId, oldestController] = userConnections[0];
  try {
    oldestController.close();
    sseConnections.delete(oldestConnId);
    console.log('Removed oldest SSE connection:', oldestConnId);
    return true;
  } catch (error) {
    console.error('Failed to close oldest connection:', oldestConnId, error);
    sseConnections.delete(oldestConnId); // Remove from map even if close failed
    return true;
  }
}

function cleanupConnectionTimestamps(userId: string, accountType: string) {
  const userKey = `${userId}_${accountType}`;
  const timestamps = connectionTimestamps.get(userKey) || [];
  const now = Date.now();

  // Keep only recent timestamps
  const validTimestamps = timestamps.filter(ts => now - ts < CONNECTION_RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length === 0) {
    connectionTimestamps.delete(userKey);
  } else {
    connectionTimestamps.set(userKey, validTimestamps);
  }
}

/**
 * OPTIONS - Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return handleOptionsRequest(request);
}

/**
 * GET - Server-Sent Events endpoint
 */
export async function GET(request: NextRequest) {
  let keepAlive: NodeJS.Timeout | undefined;

  try {
    const user = await verifySecureAuth(request);
    if (!user) {
      return createCORSResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
        request
      );
    }

    // Check rate limiting
    if (!checkRateLimit(user.userId, user.accountType)) {
      return createCORSResponse(
        JSON.stringify({
          error: 'Too many connection attempts',
          message: 'Please wait before attempting to connect again'
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        },
        request
      );
    }

    // Check existing connections for this user
    const activeConnections = getActiveConnectionsForUser(user.userId, user.accountType);

    if (activeConnections >= MAX_CONNECTIONS_PER_USER) {
      // Try to remove oldest connection
      const removed = removeOldestConnection(user.userId, user.accountType);

      if (!removed) {
        return createCORSResponse(
          JSON.stringify({
            error: 'Connection limit exceeded',
            message: 'Maximum connections per user reached'
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          },
          request
        );
      }
    }

    const connectionId = `${user.userId}_${user.accountType}_${Date.now()}`;

    let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

    // Cleanup function to ensure timer is always cleared
    const cleanupKeepAlive = () => {
      if (keepAlive) {
        clearInterval(keepAlive);
        keepAlive = undefined;
      }
    };

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
          } catch (err) {
            console.error('Keep-alive ping failed:', {
              function: 'keepAlive',
              connectionId,
              userId: user.userId,
              accountType: user.accountType,
              error: err instanceof Error ? err.message : 'Unknown error',
              stack: err instanceof Error ? err.stack : undefined,
              timestamp: new Date().toISOString()
            });

            cleanupKeepAlive();
            sseConnections.delete(connectionId);
            // Clean up connection timestamps
            cleanupConnectionTimestamps(user.userId, user.accountType);
          }
        }, 30000);
      },
      cancel(reason) {
        cleanupKeepAlive();
        if (controllerRef) {
          sseConnections.delete(connectionId);
          // Clean up connection timestamps
          cleanupConnectionTimestamps(user.userId, user.accountType);
        }
        console.log('SSE connection closed:', connectionId, 'reason:', reason);
      },
    });

    // Create response with secure CORS headers
    const corsHeaders = createCORSHeaders(request, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
    });

    return new Response(stream, {
      headers: corsHeaders,
    });
  } catch (error) {
    // Ensure keep-alive timer is cleaned up on any error
    if (keepAlive) {
      clearInterval(keepAlive);
      keepAlive = undefined;
    }

    console.error('SSE endpoint error:', error);
    return createCORSResponse(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      },
      request
    );
  }
}

/**
 * Broadcast to specific user
 */
export function broadcastToUser(
  userId: string,
  accountType: string,
  notification: Notification
) {
  const userConnections = Array.from(sseConnections.entries()).filter(
    ([connId]) => connId.startsWith(`${userId}_${accountType}_`)
  );

  for (const [connId, controller] of Array.from(userConnections)) {
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
    } catch (err) {
      console.error('SSE broadcastToUser failed:', {
        function: 'broadcastToUser',
        connId,
        userId,
        accountType,
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString()
      });
      sseConnections.delete(connId);
      // Clean up connection timestamps
      cleanupConnectionTimestamps(userId, accountType);
    }
  }
}

/**
 * Broadcast to all
 */
export function broadcastToAll(notification: Notification) {
  for (const [connId, controller] of Array.from(sseConnections.entries())) {
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
    } catch (err) {
      console.error('SSE broadcastToAll failed:', {
        function: 'broadcastToAll',
        connId,
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString()
      });
      sseConnections.delete(connId);
      // Clean up connection timestamps for the user this connection belonged to
      const connIdParts = connId.split('_');
      if (connIdParts.length >= 2) {
        const userId = connIdParts[0];
        const accountType = connIdParts[1];
        cleanupConnectionTimestamps(userId, accountType);
      }
    }
  }
}

/**
 * Active connections count
 */
export function getActiveConnections() {
  return sseConnections.size;
}

/**
 * Get connection statistics for monitoring
 */
export function getConnectionStats() {
  const stats = {
    total: sseConnections.size,
    byUser: new Map<string, number>(),
    rateLimitWindows: connectionTimestamps.size,
  };

  // Count connections per user
  for (const connId of sseConnections.keys()) {
    const parts = connId.split('_');
    if (parts.length >= 2) {
      const userKey = `${parts[0]}_${parts[1]}`;
      stats.byUser.set(userKey, (stats.byUser.get(userKey) || 0) + 1);
    }
  }

  return stats;
}
