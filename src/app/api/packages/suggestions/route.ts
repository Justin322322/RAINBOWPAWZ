import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const limit = Math.min(Number(url.searchParams.get('limit') || 10), 50);

    const params: any[] = [];
    const likeClause = q ? 'WHERE description LIKE ?' : '';
    if (q) params.push(`%${q}%`);

    const inclusions = (await query(
      `SELECT description FROM package_inclusion_suggestions ${likeClause} ORDER BY popularity DESC, description ASC LIMIT ${Number(limit)}`,
      params
    )) as any[];

    const addOns = (await query(
      `SELECT name, default_price FROM package_addon_suggestions ${q ? 'WHERE name LIKE ?' : ''} ORDER BY popularity DESC, name ASC LIMIT ${Number(limit)}`,
      q ? [`%${q}%`] : []
    )) as any[];

    return NextResponse.json({
      inclusions: inclusions.map((r) => r.description),
      addOns: addOns.map((r) => ({ name: r.name, price: Number(r.default_price || 0) }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to load suggestions', details: err.message }, { status: 500 });
  }
}


