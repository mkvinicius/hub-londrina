import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Categorias from "@/pages/categorias";
import Busca from "@/pages/busca";
import Negocio from "@/pages/negocio";
import Anuncie from "@/pages/anuncie";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminNegocios from "@/pages/admin/AdminNegocios";
import AdminCategorias from "@/pages/admin/AdminCategorias";
import { isAuthenticated } from "@/lib/admin-api";
import { queryClient } from "@/lib/query-client";

export { queryClient };

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  if (!isAuthenticated()) {
    return <Redirect to="/admin/login" />;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/categorias" component={Categorias} />
      <Route path="/busca" component={Busca} />
      <Route path="/negocio/:id" component={Negocio} />
      <Route path="/anuncie" component={Anuncie} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/negocios">{() => <PrivateRoute component={AdminNegocios} />}</Route>
      <Route path="/admin/categorias">{() => <PrivateRoute component={AdminCategorias} />}</Route>
      <Route path="/admin">{() => <PrivateRoute component={AdminDashboard} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
