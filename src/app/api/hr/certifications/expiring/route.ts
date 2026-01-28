import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');
    const days = searchParams.get('days') || '90';
    const personnel_id = searchParams.get('personnel_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!org_id) {
      return NextResponse.json({ error: 'org_id is required' }, { status: 400 });
    }

    const params: any = { org_id, days, limit, offset };
    if (personnel_id) params.personnel_id = personnel_id;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/hr/certifications/expiring?${new URLSearchParams(params)}`,
      { headers: { Authorization: authHeader } }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching expiring certifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
