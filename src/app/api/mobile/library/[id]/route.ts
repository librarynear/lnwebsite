import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ id: params.id, name: 'Mock Library', photos: [], address: '123 Street', locality: 'Area', plans: [] });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
