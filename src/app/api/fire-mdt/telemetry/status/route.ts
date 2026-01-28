import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unit_id = searchParams.get('unit_id');
    const device_id = searchParams.get('device_id');

    const params = new URLSearchParams();
    if (unit_id) params.append('unit_id', unit_id);
    if (device_id) params.append('device_id', device_id);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fire-mdt/telemetry/status?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching OBD availability status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
