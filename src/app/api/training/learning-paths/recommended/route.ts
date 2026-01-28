import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');
    const user_id = searchParams.get('user_id');

    if (!org_id || !user_id) {
      return NextResponse.json({ error: 'org_id and user_id are required' }, { status: 400 });
    }

    const params: any = { org_id, user_id };

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/training/learning-paths/recommended?${new URLSearchParams(params)}`, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching AI recommendations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
