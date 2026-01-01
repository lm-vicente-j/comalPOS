import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest){
    const session = request.cookies.get('session');
    const { pathname } = request.nextUrl;



    // NOT AUTH, RESTRICTED PATHS TRY, redirect to login
    if(!session && pathname !== "/admin"){
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Try to login but already auth, redirect to index
    if(session && pathname === "/login"){
        return NextResponse.redirect(new URL('/', request.url));
    }

    // RBAC
    if( session && pathname.startsWith("/admin")){
        try{
            const user = JSON.parse(session.value);
            if(user.role !== 'admin'){
                return NextResponse.redirect(new URL('/', request.url));
            }
        }catch(error){
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('session');
            return response;
        }
    }

    return NextResponse.next();

}

export const config = {
  matcher: [

    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};