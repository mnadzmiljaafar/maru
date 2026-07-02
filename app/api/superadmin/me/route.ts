import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Lightweight guard used by the /superadmin page to decide whether to render.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    success: true,
    data: { email: user.email, isSuperadmin: user.isSuperadmin },
  });
}
