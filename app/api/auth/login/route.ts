import { NextResponse } from 'next/server';
import crypto from 'crypto';

const VALID_USERNAME = 'marumaru';
const VALID_PASSWORD = 'marusayang';

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Verify credentials
    if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken();

    // Create response with token
    const response = NextResponse.json(
      {
        success: true,
        token,
        user: {
          username,
          id: '1',
        },
      },
      { status: 200 }
    );

    // Set HTTP-only cookie for added security
    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
