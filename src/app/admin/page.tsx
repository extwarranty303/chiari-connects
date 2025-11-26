import { AppHeader } from '@/components/app/header';
import AdminRouteGuard from '@/components/app/admin-route-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * @fileoverview This is the main page for the Admin Dashboard.
 *
 * It is wrapped in an AdminRouteGuard to ensure that only users with the 'admin'
 * custom claim can access it. It serves as the entry point for all administrative
li>
 * functionalities, such as user management and report generation.
 */

/**
 * The main component for the Admin Dashboard page.
 * It provides the overall layout and structure for the admin section.
 *
 * @returns {React.ReactElement} The rendered admin dashboard page.
 */
export default function AdminDashboardPage() {
  return (
    <AdminRouteGuard>
      <div className="flex flex-col h-screen bg-background text-foreground font-body">
        <AppHeader onUploadClick={() => {}} onDownloadClick={() => {}} showActions={false} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto grid gap-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage users, view reports, and moderate content.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Welcome, Admin!</CardTitle>
                <CardDescription>
                  This is the central hub for managing the Chiari Connects application.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  User management and reporting features will be built out here.
                </p>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </AdminRouteGuard>
  );
}