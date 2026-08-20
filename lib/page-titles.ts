const PAGE_TITLES: Record<string, string> = {
  "/student/dashboard": "Dashboard",
  "/student/new-request": "New Request",
  "/student/history": "My History",
  "/student/profile": "My Profile",
  "/registrar/dashboard": "Dashboard",
  "/registrar/requests": "Manage Requests",
  "/registrar/payments": "Verify Payments",
  "/registrar/reports": "Reports",
  "/admin/dashboard": "Dashboard",
  "/admin/users": "Manage Users",
  "/admin/import-records": "Import Records",
  "/admin/analytics": "Analytics",
  "/admin/reports": "Reports",
  "/guidance/dashboard": "Dashboard",
  "/guidance/approvals": "Good Moral Approvals",
};

export function getPageTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? "Dashboard";
}
