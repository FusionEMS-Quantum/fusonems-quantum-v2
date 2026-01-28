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
    const unit_id = searchParams.get('unit_id');
    const station_id = searchParams.get('station_id');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const params = new URLSearchParams();
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    if (unit_id) params.append('unit_id', unit_id);
    if (station_id) params.append('station_id', station_id);
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fire-mdt/incidents/history?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching MDT incident history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
