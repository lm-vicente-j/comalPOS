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
    <div className="flex-column m-0 p-0 overflow-hidden max-w max-h content-center items-start h-screen bg-gray-50 text-gray-900">
        <Topbar userName={user.name} />

        <main className="flex w-screen overflow-y-auto ">
        <Sidebar userRole={String(user.role)} />

          <div className="max-w-7xl mx-auto flex items-center content-center">
            {children}
          </div>
        </main>

    </div>
  );
}