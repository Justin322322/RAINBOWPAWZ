import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureAdminLogsTable } from './ensure-table';

export async function GET(request: NextRequest) {
  try {
    // Ensure the admin_logs table exists
    await ensureAdminLogsTable();
    
    // Get query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const action = url.searchParams.get('action');
    const entityType = url.searchParams.get('entity_type');
    const entityId = url.searchParams.get('entity_id');
    const adminId = url.searchParams.get('admin_id');
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Build the query
    let sql = `
      SELECT 
        al.*,
        COALESCE(a.username, 'Unknown') as admin_username,
        COALESCE(a.full_name, 'Unknown Admin') as admin_name
      FROM 
        admin_logs al
      LEFT JOIN
        admins a ON al.admin_id = a.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // Add filters
    if (action) {
      sql += ' AND al.action = ?';
      params.push(action);
    }
    
    if (entityType) {
      sql += ' AND al.entity_type = ?';
      params.push(entityType);
    }
    
    if (entityId) {
      sql += ' AND al.entity_id = ?';
      params.push(parseInt(entityId));
    }
    
    if (adminId) {
      sql += ' AND al.admin_id = ?';
      params.push(parseInt(adminId));
    }
    
    // Add order by and limit
    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // Execute the query
    const logs = await query(sql, params) as any[];
    
    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM admin_logs
      WHERE 1=1
    `;
    
    const countParams: any[] = [];
    
    // Add filters to count query
    if (action) {
      countSql += ' AND action = ?';
      countParams.push(action);
    }
    
    if (entityType) {
      countSql += ' AND entity_type = ?';
      countParams.push(entityType);
    }
    
    if (entityId) {
      countSql += ' AND entity_id = ?';
      countParams.push(parseInt(entityId));
    }
    
    if (adminId) {
      countSql += ' AND admin_id = ?';
      countParams.push(parseInt(adminId));
    }
    
    // Execute the count query
    const countResult = await query(countSql, countParams) as any[];
    const total = countResult[0]?.total || 0;
    
    // Parse JSON details
    const formattedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));
    
    return NextResponse.json({
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch admin logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
