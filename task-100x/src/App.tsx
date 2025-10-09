import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import BuildInPublic from "./pages/BuildInPublic";
import BuildInPublicUserDetailPage from "./pages/BuildInPublicUserDetailPage";
import AuthPage from "./components/Auth/AuthPage";
import useAuth from "./hooks/useAuth";
import AdminDashboard from "./components/Dashboard/AdminDashboard";
import Dashboard from "./components/Dashboard/Dashboard";
import { Loader2 } from "lucide-react";
import NotificationsPage from "./pages/NotificationsPage";

const queryClient = new QueryClient();

const App = () => {
  const { isAuthenticated, user, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-10 z-50">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={login} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                user?.role === 'INSTRUCTOR' ? (
                  <AdminDashboard userEmail={user.email} />
                ) : (
                  <Dashboard userEmail={user.email} userName={user.name}/>
                )
              }
            />
            {user?.role === 'INSTRUCTOR' && (
              <Route path="/admin">
                <Route path="track-100x" element={<BuildInPublic />} />
                <Route path="track-100x/:userId" element={<BuildInPublicUserDetailPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
            )}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
