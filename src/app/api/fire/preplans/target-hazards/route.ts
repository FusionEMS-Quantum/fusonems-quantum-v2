import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const min_risk = searchParams.get('min_risk');

    const params = new URLSearchParams();
    if (min_risk) params.append('min_risk', min_risk);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/fire/preplans/target-hazards?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch target hazards' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching target hazards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
