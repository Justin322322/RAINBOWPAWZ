import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureAdminLogsTable } from './ensure-table';
import { verifySecureAuth } from '@/lib/secureAuth';

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
    const search = url.searchParams.get('search');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Build the query
    let sql = `
      SELECT
        al.*,
        CASE
          WHEN al.admin_id = 0 THEN 'system'
          ELSE COALESCE(ap.username, 'Unknown')
        END as admin_username,
        CASE
          WHEN al.admin_id = 0 THEN 'System'
          ELSE COALESCE(ap.full_name, 'Unknown Admin')
        END as admin_name
      FROM
        admin_logs al
      LEFT JOIN
        admin_profiles ap ON al.admin_id = ap.user_id AND al.admin_id != 0
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

    if (search) {
      sql += ' AND (al.action LIKE ? OR al.entity_type LIKE ? OR al.details LIKE ? OR ap.username LIKE ? OR ap.full_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (dateFrom) {
      sql += ' AND DATE(al.created_at) >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ' AND DATE(al.created_at) <= ?';
      params.push(dateTo);
    }
    
    // Add order by and limit
    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // Execute the query
    const logs = await query(sql, params) as any[];
    
    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM admin_logs al
      LEFT JOIN admin_profiles ap ON al.admin_id = ap.user_id
      WHERE 1=1
    `;

    const countParams: any[] = [];

    // Add filters to count query (same as main query)
    if (action) {
      countSql += ' AND al.action = ?';
      countParams.push(action);
    }

    if (entityType) {
      countSql += ' AND al.entity_type = ?';
      countParams.push(entityType);
    }

    if (entityId) {
      countSql += ' AND al.entity_id = ?';
      countParams.push(parseInt(entityId));
    }

    if (adminId) {
      countSql += ' AND al.admin_id = ?';
      countParams.push(parseInt(adminId));
    }

    if (search) {
      countSql += ' AND (al.action LIKE ? OR al.entity_type LIKE ? OR al.details LIKE ? OR ap.username LIKE ? OR ap.full_name LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (dateFrom) {
      countSql += ' AND DATE(al.created_at) >= ?';
      countParams.push(dateFrom);
    }

    if (dateTo) {
      countSql += ' AND DATE(al.created_at) <= ?';
      countParams.push(dateTo);
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

export async function DELETE(request: NextRequest) {
  try {
    // Secure admin authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ensure table exists
    await ensureAdminLogsTable();

    // Parse body for id or ids
    const body = await request.json().catch(() => ({}));
    const { id, ids } = body as { id?: number; ids?: number[] };

    if (!id && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return NextResponse.json({ error: 'Missing id or ids' }, { status: 400 });
    }

    if (id) {
      // Delete single log and return actual affected rows
      const result = (await query('DELETE FROM admin_logs WHERE id = ?', [id])) as any;
      const affected = typeof result?.affectedRows === 'number' ? result.affectedRows : undefined;
      return NextResponse.json({ success: true, deleted: affected });
    }

    // Delete multiple logs
    const placeholders = ids!.map(() => '?').join(',');
    const result = (await query(`DELETE FROM admin_logs WHERE id IN (${placeholders})`, ids)) as any;
    const affected = typeof result?.affectedRows === 'number' ? result.affectedRows : undefined;
    return NextResponse.json({ success: true, deleted: affected });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to delete admin logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
