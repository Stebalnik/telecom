export function refreshAdminSidebar() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("admin-sidebar-refresh"));
}