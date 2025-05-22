// src/app/api/packages/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { query, checkTableExists } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import fs from 'fs';
import path from 'path';

type RawServiceRow = Record<string, any>;
type PackageResponse = {
  id: number;
  name: string;
  description: string;
  category: string;
  cremationType: string;
  processingTime: string;
  price: string;
  priceValue: number;
  conditions: string;
  status: 'active' | 'inactive';
  cremationCenter: string;
  providerId: number;
  rating: number;
  bookings: number;
  revenue: number;
  formattedRevenue: string;
  image: string | null;
  images: string[];
  inclusions: string[];
  addOns: string[];
};

async function listImagePaths(packageId: number): Promise<string[]> {
  const baseDir = path.join(process.cwd(), 'public', 'uploads', 'packages');
  const result: string[] = [];

  // Check package-specific folder
  const pkgDir = path.join(baseDir, String(packageId));
  if (fs.existsSync(pkgDir)) {
    for (const file of fs.readdirSync(pkgDir)) {
      if (/\.(jpe?g|png|gif|webp|svg)$/i.test(file)) {
        result.push(`/uploads/packages/${packageId}/${file}`);
      }
    }
    if (result.length) return result;
  }

  // Fallback to flat files
  if (fs.existsSync(baseDir)) {
    for (const file of fs.readdirSync(baseDir)) {
      if (
        file.startsWith(`package_${packageId}_`) ||
        file === `${packageId}.jpg` ||
        file === `${packageId}.png`
      ) {
        result.push(`/uploads/packages/${file}`);
      }
    }
  }

  return result;
}

async function gatherRevenueStats(): Promise<{ total: number; monthly: number }> {
  const hasSuccess = await checkTableExists('successful_bookings');
  const hasService = await checkTableExists('service_bookings');
  let total = 0, monthly = 0;

  if (hasSuccess) {
    const [[{ total: tot }]] = await Promise.all([
      query(`SELECT COALESCE(SUM(transaction_amount),0) AS total FROM successful_bookings WHERE payment_status='completed'`),
      query(`SELECT COALESCE(SUM(transaction_amount),0) AS total FROM successful_bookings WHERE payment_status='completed' AND MONTH(payment_date)=MONTH(CURRENT_DATE()) AND YEAR(payment_date)=YEAR(CURRENT_DATE())`)
    ]);
    total = +tot;
    monthly = +((await query(
      `SELECT COALESCE(SUM(transaction_amount),0) AS total
       FROM successful_bookings
       WHERE payment_status='completed'
         AND MONTH(payment_date)=MONTH(CURRENT_DATE())
         AND YEAR(payment_date)=YEAR(CURRENT_DATE())`
    ))[0].total);
  } else if (hasService) {
    total = +((await query(
      `SELECT COALESCE(SUM(price),0) AS total FROM service_bookings WHERE status='completed'`
    ))[0].total_revenue);
    monthly = +((await query(
      `SELECT COALESCE(SUM(price),0) AS total FROM service_bookings WHERE status='completed' AND MONTH(created_at)=MONTH(CURRENT_DATE()) AND YEAR(created_at)=YEAR(CURRENT_DATE())`
    ))[0].total_revenue);
  } else {
    total = +((await query(
      `SELECT COALESCE(SUM(price),0) AS total_price FROM service_packages`
    ))[0].total_price);
    monthly = total / 12;
  }

  // If there's no real revenue data, keep it as 0
  // This will show as ₱0.00 in the UI, accurately reflecting that there's no revenue yet

  return { total, monthly };
}

export async function GET(request: NextRequest) {
  // --- Authentication ---
  const dev = process.env.NODE_ENV !== 'production';
  let isAuth = false;
  const token = getAuthTokenFromRequest(request);
  if (token) {
    const [, role] = token.split('_');
    isAuth = role === 'admin';
  } else if (dev) {
    isAuth = true;
  }
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // --- Query params ---
  const url = new URL(request.url);
  const s = url.searchParams.get('search') || '';
  const statusF = url.searchParams.get('status') || 'all';
  const catF = url.searchParams.get('category') || 'all';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '20'));
  const offset = (page - 1) * limit;

  // --- Ensure table exists ---
  if (!(await checkTableExists('service_packages'))) {
    return NextResponse.json({
      success: true,
      services: [],
      pagination: { total: 0, page, limit, totalPages: 0 }
    });
  }

  // --- Build main query ---
  const cols = [
    'p.package_id', 'p.name', 'p.description',
    "COALESCE(p.price,0) AS price",
    "COALESCE(p.is_active,1) AS is_active",
    "COALESCE(p.category,'standard') AS category",
    "COALESCE(p.cremation_type,'') AS cremationType",
    "COALESCE(p.processing_time,'2-3 days') AS processingTime",
    "COALESCE(p.conditions,'') AS conditions",
    "sp.provider_id AS providerId", "COALESCE(sp.name,'Cremation Center') AS providerName"
  ];
  // Build the JOIN clause - using the correct column names for joining
  const joinSP = await checkTableExists('service_providers')
    ? 'LEFT JOIN service_providers sp ON p.provider_id=sp.provider_id'
    : '';
  let sql = `SELECT ${cols.join(', ')} FROM service_packages p ${joinSP} WHERE 1=1`;
  const params: any[] = [];

  if (s) {
    sql += ' AND (p.name LIKE ? OR sp.name LIKE ?)';
    params.push(`%${s}%`, `%${s}%`);
  }
  if (statusF !== 'all') {
    sql += ' AND p.is_active = ?';
    params.push(statusF === 'active' ? 1 : 0);
  }
  if (catF !== 'all') {
    sql += ' AND p.category = ?';
    params.push(catF);
  }
  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  // --- Execute main query with fallback ---
  let rows: RawServiceRow[];
  try {
    rows = (await query(sql, params)) as RawServiceRow[];
  } catch (err) {
    console.error('Primary query failed:', err);
    // fallback simple query
    rows = (await query(
      `SELECT package_id,name,description,0 AS price,1 AS is_active,'standard' AS category,'' AS cremationType,'2-3 days' AS processingTime,'' AS conditions,'Cremation Center' AS providerName,0 AS providerId
       FROM service_packages LIMIT ? OFFSET ?`,
      [limit, offset]
    )) as RawServiceRow[];
  }

  // --- Total count ---
  let total = 0;
  try {
    total = +((await query(`SELECT COUNT(*) AS t FROM service_packages`))[0].t || 0);
  } catch {
    total = rows.length;
  }

  // --- Revenue stats ---
  const { total: totalRev, monthly } = await gatherRevenueStats();
  const monthlyRev = `₱${monthly.toLocaleString('en-US',{ minimumFractionDigits:2, maximumFractionDigits:2 })}`;

  // --- Format each service ---
  const services: PackageResponse[] = await Promise.all(
    rows.map(async r => {
      const status = r.is_active ? 'active' : 'inactive';
      const priceVal = +r.price;
      const priceFmt = `₱${priceVal.toLocaleString('en-US',{ minimumFractionDigits:2, maximumFractionDigits:2 })}`;

      const images = await listImagePaths(r.package_id);
      const [image] = images;

      // inclusions & add-ons
      const incs = ((await query(
        `SELECT description FROM package_inclusions WHERE package_id=?`, [r.package_id]
      )) as any[]).map(x => x.description);
      const adds = ((await query(
        `SELECT description FROM package_addons WHERE package_id=?`, [r.package_id]
      )) as any[]).map(x => x.description);

      // bookings & rating
      let bookings = 0, rating = 0;
      try {
        const cb = await checkTableExists('service_bookings');
        if (cb) {
          bookings = +((await query(`SELECT COUNT(*) AS c FROM service_bookings WHERE package_id=?`, [r.package_id]))[0].c || 0);
        }
      } catch {}
      try {
        const cr = await checkTableExists('reviews');
        if (cr) {
          rating = +(await query(
            `SELECT COALESCE(AVG(rating),0) AS avg FROM reviews WHERE service_provider_id=?`,
            [r.providerId]
          ))[0].avg || 0;
        }
      } catch {}
      // If no rating is available from the database, keep it as 0
      // This will show as "No ratings" or "0.0" in the UI

      const revenue = 0; // hide per-service revenue as per original
      const formattedRevenue = `₱0.00`;

      // Map package_id to id for frontend compatibility
      return {
        id: r.package_id,
        name: r.name,
        description: r.description,
        category: r.category,
        cremationType: r.cremationType,
        processingTime: r.processingTime,
        price: priceFmt,
        priceValue: priceVal,
        conditions: r.conditions,
        status,
        cremationCenter: r.providerName,
        providerId: r.providerId,
        rating,
        bookings,
        revenue,
        formattedRevenue,
        image: image || null,
        images,
        inclusions: incs,
        addOns: adds,
      };
    })
  );

  // --- Build response ---
  const totalPages = Math.ceil(total / limit) || 1;
  return NextResponse.json({
    success: true,
    services,
    totalRevenue: totalRev,
    monthlyRevenue: monthlyRev,
    serviceProvidersCount: services.reduce((s, x) => s + (x.providerId>0?1:0), 0),
    activeServicesCount: services.filter(s => s.status==='active').length,
    pagination: { total, page, limit, totalPages }
  });
}
