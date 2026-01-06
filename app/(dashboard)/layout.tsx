import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie) {
    redirect('/login');
  }
  

  const user = JSON.parse(sessionCookie.value);






  return (
    <div className="flex flex-col overflow-hidden h-screen bg-gray-50 text-gray-900">
        <Topbar userName={user.name} />

        <main className="flex flex-1 w-full overflow-hidden ">
        <Sidebar userRole={String(user.role)} />

          <div className="flex-1 w-full mx-auto flex items-center content-center">
            {children}
          </div>
        </main>

    </div>
  );
}