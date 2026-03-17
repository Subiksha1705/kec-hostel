import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { rows } = await pool.query('SELECT 1 AS health');
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    console.error('DB health check failed', error);
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
