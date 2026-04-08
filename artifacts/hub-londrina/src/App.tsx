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
import Cadastro from "@/pages/Cadastro";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminNegocios from "@/pages/admin/AdminNegocios";
import AdminLojistas from "@/pages/admin/AdminLojistas";
import AdminCategorias from "@/pages/admin/AdminCategorias";
import LojistaLogin from "@/pages/lojista/LojistaLogin";
import LojistaDashboard from "@/pages/lojista/LojistaDashboard";
import LojistaPerfil from "@/pages/lojista/LojistaPerfil";
import LojistaFotos from "@/pages/lojista/LojistaFotos";
import LojistaProdutos from "@/pages/lojista/LojistaProdutos";
import LojistaMetricas from "@/pages/lojista/LojistaMetricas";
import LojistaPlano from "@/pages/lojista/LojistaPlano";
import LojistaSenha from "@/pages/lojista/LojistaSenha";
import { isAuthenticated } from "@/lib/admin-api";
import { isLojistaAuthenticated } from "@/lib/lojista-api";
import { queryClient } from "@/lib/query-client";

export { queryClient };

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  if (!isAuthenticated()) {
    return <Redirect to="/admin/login" />;
  }
  return <Component />;
}

function LojistaPrivateRoute({ component: Component }: { component: React.ComponentType }) {
  if (!isLojistaAuthenticated()) {
    return <Redirect to="/lojista/login" />;
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
      <Route path="/cadastro" component={Cadastro} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/negocios">{() => <PrivateRoute component={AdminNegocios} />}</Route>
      <Route path="/admin/lojistas">{() => <PrivateRoute component={AdminLojistas} />}</Route>
      <Route path="/admin/categorias">{() => <PrivateRoute component={AdminCategorias} />}</Route>
      <Route path="/admin">{() => <PrivateRoute component={AdminDashboard} />}</Route>
      <Route path="/lojista/login" component={LojistaLogin} />
      <Route path="/lojista/perfil">{() => <LojistaPrivateRoute component={LojistaPerfil} />}</Route>
      <Route path="/lojista/fotos">{() => <LojistaPrivateRoute component={LojistaFotos} />}</Route>
      <Route path="/lojista/produtos">{() => <LojistaPrivateRoute component={LojistaProdutos} />}</Route>
      <Route path="/lojista/metricas">{() => <LojistaPrivateRoute component={LojistaMetricas} />}</Route>
      <Route path="/lojista/plano">{() => <LojistaPrivateRoute component={LojistaPlano} />}</Route>
      <Route path="/lojista/senha">{() => <LojistaPrivateRoute component={LojistaSenha} />}</Route>
      <Route path="/lojista">{() => <LojistaPrivateRoute component={LojistaDashboard} />}</Route>
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
