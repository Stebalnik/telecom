import AdminSidebar from "../../components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-start">
        <div className="md:w-72 md:shrink-0">
          <AdminSidebar />
        </div>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}