import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import StoreInitializer from '@/components/StoreInitializer';
import { auth } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  const session = await auth();
  const user = session?.user;
  const staffName = user?.name || "NONE";
  const role = user?.role || "NONE";
  const userId = session?.user?.id || "-1";
   
  return (
    <div className="flex flex-col overflow-hidden h-screen bg-gray-50 text-gray-900">
        <StoreInitializer userId={userId} />
        <Topbar userName={staffName} />

        {/* Removed overflow-hidden from main to allow scrolling on mobile if needed */}
        <main className="flex flex-1 w-full overflow-hidden">
          <Sidebar userRole={role} />

          {/* Added pb-16 to provide space for the fixed bottom bar on mobile */}
          <div className="flex-1 w-full mx-auto flex items-center content-center pb-16 lg:pb-0 overflow-y-auto">
            {children}
          </div>
        </main>
    </div>
  );
}