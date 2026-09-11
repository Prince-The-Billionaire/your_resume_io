import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Exchange the code for a session using your auth provider client here
  }

  // Redirect user to the app dashboard or home page after handling the code
  return NextResponse.redirect(new URL('/', request.url));
}