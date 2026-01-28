import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const format = searchParams.get('format') || 'json';

    if (!start_date || !end_date) {
      return NextResponse.json({ error: 'Start date and end date required' }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.append('start_date', start_date);
    params.append('end_date', end_date);
    params.append('format', format);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/fire/incidents/nfirs-export?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to generate NFIRS export' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating NFIRS export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
