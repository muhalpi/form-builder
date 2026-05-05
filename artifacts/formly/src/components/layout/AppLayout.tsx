import { Link, useLocation } from "wouter";
import { LayoutDashboard, Plus, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateForm } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListFormsQueryKey } from "@workspace/api-client-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createForm = useCreateForm();

  const handleNewForm = () => {
    createForm.mutate(
      { data: { title: "Untitled Form", themeColor: "#6366f1" } },
      {
        onSuccess: (form) => {
          queryClient.invalidateQueries({ queryKey: getListFormsQueryKey() });
          setLocation(`/forms/${form.id}/build`);
        },
      }
    );
  };

  const nav = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground tracking-tight">Formly</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors",
                  location === href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <button
            onClick={handleNewForm}
            disabled={createForm.isPending}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            data-testid="button-new-form"
          >
            <Plus className="w-4 h-4" />
            {createForm.isPending ? "Creating..." : "New Form"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
