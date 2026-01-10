import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from './lib/auth' 

export default async function (request: NextRequest) {

  const session = await auth();
  const pathname = request.nextUrl.pathname;

  if (session?.user && pathname === "/login") {
    return NextResponse.redirect(new URL('/', request.url));
  }
  if (!session?.user && pathname !== "/login") {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  



const headers = new Headers(request.headers);
  headers.set("x-current-path", request.nextUrl.pathname);
  return NextResponse.next({
    request: {
      headers: headers,
    },
  });
}
 
 
export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
}