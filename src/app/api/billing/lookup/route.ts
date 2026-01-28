import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { accountNumber, zipCode } = await request.json()

    if (!accountNumber || !zipCode) {
      return NextResponse.json(
        { error: 'Account number and ZIP code are required' },
        { status: 400 }
      )
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    
    const response = await fetch(`${backendUrl}/api/v1/billing/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_number: accountNumber,
        zip_code: zipCode,
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      account: {
        accountNumber: data.account_number,
        balance: data.balance,
        patientName: data.patient_name,
        serviceDate: data.service_date,
      }
    })

  } catch (error) {
    console.error('Billing lookup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
