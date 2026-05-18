import { NextResponse } from 'next/server';

export async function POST() {
  return new NextResponse('OK', { status: 200 });
}

export async function GET() {
  return new NextResponse('OK', { status: 200 });
}
