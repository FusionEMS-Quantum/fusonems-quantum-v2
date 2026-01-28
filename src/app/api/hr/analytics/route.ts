import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');
    const metric = searchParams.get('metric');
    const department = searchParams.get('department');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    if (!org_id) {
      return NextResponse.json({ error: 'org_id is required' }, { status: 400 });
    }

    const params: any = { org_id };
    if (metric) params.metric = metric;
    if (department) params.department = department;
    if (start_date) params.start_date = start_date;
    if (end_date) params.end_date = end_date;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/hr/analytics?${new URLSearchParams(params)}`,
      { headers: { Authorization: authHeader } }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching HR analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
