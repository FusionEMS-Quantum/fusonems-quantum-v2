import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const device_id = searchParams.get('device_id');

    const params = new URLSearchParams();
    if (device_id) params.append('device_id', device_id);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fire-mdt/offline/status?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching offline queue status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
