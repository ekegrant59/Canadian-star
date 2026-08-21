'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // If on login or 2FA setup/verification pages, render clean standalone full-screen view
  if (pathname.startsWith('/admin/login') || pathname.startsWith('/admin/invite')) {
    return <div className="min-h-screen bg-[#0e0e0e] text-[#e5e2e1]">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-[#F4F3F1] font-sans text-gray-900">
      {/* Dark Sidebar */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Workspace */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <AdminHeader onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
