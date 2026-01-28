import { NextRequest, NextResponse } from 'next/server'

interface DemoRequestBody {
  name: string
  email: string
  organization: string
  phone: string
  role: string
  challenges?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: DemoRequestBody = await request.json()

    const { name, email, organization, phone, role, challenges } = body

    if (!name || !email || !organization || !phone || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const demoRequest = {
      name,
      email,
      organization,
      phone,
      role,
      challenges: challenges || '',
      timestamp: new Date().toISOString(),
      status: 'pending',
      source: 'website',
    }

    console.log('Demo Request Received:', demoRequest)

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    
    try {
      const backendResponse = await fetch(`${backendUrl}/api/v1/demo-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(demoRequest),
      })

      if (!backendResponse.ok) {
        console.error('Backend API error:', await backendResponse.text())
      }
    } catch (backendError) {
      console.error('Failed to send to backend:', backendError)
    }

    if (process.env.POSTMARK_API_KEY) {
      try {
        await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': process.env.POSTMARK_API_KEY,
          },
          body: JSON.stringify({
            From: process.env.POSTMARK_FROM_EMAIL || 'noreply@fusionems.com',
            To: process.env.DEMO_NOTIFICATION_EMAIL || 'sales@fusionems.com',
            Subject: `New Demo Request: ${organization}`,
            HtmlBody: `
              <h2>New Demo Request</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Organization:</strong> ${organization}</p>
              <p><strong>Phone:</strong> ${phone}</p>
              <p><strong>Role:</strong> ${role}</p>
              <p><strong>Challenges:</strong> ${challenges || 'Not provided'}</p>
              <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            `,
            TextBody: `
              New Demo Request
              
              Name: ${name}
              Email: ${email}
              Organization: ${organization}
              Phone: ${phone}
              Role: ${role}
              Challenges: ${challenges || 'Not provided'}
              Timestamp: ${new Date().toLocaleString()}
            `,
          }),
        })

        await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': process.env.POSTMARK_API_KEY,
          },
          body: JSON.stringify({
            From: process.env.POSTMARK_FROM_EMAIL || 'noreply@fusionems.com',
            To: email,
            Subject: 'Your FusionEMS Quantum Demo Request',
            HtmlBody: `
              <h2>Thank You for Your Interest</h2>
              <p>Hi ${name},</p>
              <p>We've received your demo request for FusionEMS Quantum. Our enterprise team will contact you within 24 hours to schedule a personalized demonstration.</p>
              <p><strong>Your Information:</strong></p>
              <ul>
                <li>Organization: ${organization}</li>
                <li>Role: ${role}</li>
                <li>Email: ${email}</li>
                <li>Phone: ${phone}</li>
              </ul>
              <p>In the meantime, feel free to explore our <a href="https://fusionems.com/portals">platform architecture</a>.</p>
              <p>Best regards,<br>The FusionEMS Quantum Team</p>
            `,
          }),
        })
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
      }
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Demo request received successfully',
        requestId: `DR-${Date.now()}`
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Demo request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
