export default function CustomerContractorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold">Contractors</div>
          <div className="text-sm text-gray-600">Customer cabinet</div>
        </div>
        <a className="underline text-sm" href="/customer">
          Back
        </a>
      </div>

      <div className="flex gap-2 flex-wrap">
        <a className="rounded border px-3 py-2 text-sm" href="/customer/contractors/approved">
          Approved
        </a>
        <a className="rounded border px-3 py-2 text-sm" href="/customer/contractors/all">
          All contractors
        </a>
      </div>

      {children}
    </div>
  );
}