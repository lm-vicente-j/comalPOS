

import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';

import { auth } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  const session = await auth();
  const user = session?.user;
  const staffName = user?.name || "NONE";
  console.log(user)
  const role = user?.role || "NONE";

   


  return (
    <div className="flex flex-col overflow-hidden h-screen bg-gray-50 text-gray-900">
        <Topbar userName={staffName} />

        <main className="flex flex-1 w-full overflow-hidden ">
        <Sidebar userRole={role} />

          <div className="flex-1 w-full mx-auto flex items-center content-center">
            {children}
          </div>
        </main>

    </div>
  );
}