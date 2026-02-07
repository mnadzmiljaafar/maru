import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  );

  // Clear the auth token cookie
  response.cookies.set('authToken', '', { maxAge: 0 });

  return response;
}
