import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Add-on obrisan sa workspace-a:', data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Neispravan zahtev' }, { status: 400 });
  }
}
