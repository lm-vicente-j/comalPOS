import Sidebar from '@/components/layout/sidebar';
import Topbar from '@/components/layout/topbar';
import StoreInitializer from '@/components/StoreInitializer';
import { auth } from '@/lib/auth';
import JornadaBanner from '@/components/layout/jornada-banner';
import BannerRefresher from '@/components/layout/banner-refresher';

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
      <JornadaBanner />
      {/* <BannerRefresher/> */}
      <main className="flex flex-1 w-full overflow-hidden">
        <Sidebar userRole={role} />

        <div className="flex-1 w-full mx-auto flex flex-col pb-16 lg:pb-0 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}