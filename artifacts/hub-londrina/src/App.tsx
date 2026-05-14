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
import AdminImpulsionamento from "@/pages/admin/AdminImpulsionamento";
import AdminZonas from "@/pages/admin/AdminZonas";
import AdminHomeBanners from "@/pages/admin/AdminHomeBanners";
import AdminPatrocinadores from "@/pages/admin/AdminPatrocinadores";
import AdminCadastros from "@/pages/admin/AdminCadastros";
import AdminAssinaturas from "@/pages/admin/AdminAssinaturas";
import AdminAuditLog from "@/pages/admin/AdminAuditLog";
import AdminReviews from "@/pages/admin/AdminReviews";
import AdminSuporte from "@/pages/admin/AdminSuporte";
import LojistaLogin from "@/pages/lojista/LojistaLogin";
import EsqueciSenha from "@/pages/lojista/EsqueciSenha";
import NovaSenha from "@/pages/lojista/NovaSenha";
import VerificarEmail from "@/pages/lojista/VerificarEmail";
import LojistaDashboard from "@/pages/lojista/LojistaDashboard";
import LojistaPerfil from "@/pages/lojista/LojistaPerfil";
import LojistaProdutos from "@/pages/lojista/LojistaProdutos";
import LojistaMetricas from "@/pages/lojista/LojistaMetricas";
import LojistaPlano from "@/pages/lojista/LojistaPlano";
import LojistaSenha from "@/pages/lojista/LojistaSenha";
import LojistaSuporte from "@/pages/lojista/LojistaSuporte";
import LojistaAvaliacoes from "@/pages/lojista/LojistaAvaliacoes";
import LojistaBoost from "@/pages/lojista/LojistaBoost";
import LojistaDocumentacao from "@/pages/lojista/LojistaDocumentacao";
import AdminDocumentacao from "@/pages/admin/AdminDocumentacao";
import ZonePage from "@/pages/zona";
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
      <Route path="/norte">{() => <ZonePage zone="norte" />}</Route>
      <Route path="/sul">{() => <ZonePage zone="sul" />}</Route>
      <Route path="/leste">{() => <ZonePage zone="leste" />}</Route>
      <Route path="/oeste">{() => <ZonePage zone="oeste" />}</Route>
      <Route path="/centro">{() => <ZonePage zone="centro" />}</Route>
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/negocios">{() => <PrivateRoute component={AdminNegocios} />}</Route>
      <Route path="/admin/lojistas">{() => <PrivateRoute component={AdminLojistas} />}</Route>
      <Route path="/admin/cadastros">{() => <PrivateRoute component={AdminCadastros} />}</Route>
      <Route path="/admin/documentacao">{() => <PrivateRoute component={AdminDocumentacao} />}</Route>
      <Route path="/admin/assinaturas">{() => <PrivateRoute component={AdminAssinaturas} />}</Route>
      <Route path="/admin/impulsionamento">{() => <PrivateRoute component={AdminImpulsionamento} />}</Route>
      <Route path="/admin/zonas">{() => <PrivateRoute component={AdminZonas} />}</Route>
      <Route path="/admin/home-banners">{() => <PrivateRoute component={AdminHomeBanners} />}</Route>
      <Route path="/admin/patrocinadores">{() => <PrivateRoute component={AdminPatrocinadores} />}</Route>
      <Route path="/admin/categorias">{() => <PrivateRoute component={AdminCategorias} />}</Route>
      <Route path="/admin/reviews">{() => <PrivateRoute component={AdminReviews} />}</Route>
      <Route path="/admin/audit-log">{() => <PrivateRoute component={AdminAuditLog} />}</Route>
      <Route path="/admin/suporte">{() => <PrivateRoute component={AdminSuporte} />}</Route>
      <Route path="/admin">{() => <PrivateRoute component={AdminDashboard} />}</Route>
      <Route path="/lojista/login" component={LojistaLogin} />
      <Route path="/lojista/esqueci-senha" component={EsqueciSenha} />
      <Route path="/lojista/nova-senha" component={NovaSenha} />
      <Route path="/lojista/verificar-email" component={VerificarEmail} />
      <Route path="/lojista/perfil">{() => <LojistaPrivateRoute component={LojistaPerfil} />}</Route>
      <Route path="/lojista/fotos">{() => <Redirect to="/lojista/produtos" />}</Route>
      <Route path="/lojista/produtos">{() => <LojistaPrivateRoute component={LojistaProdutos} />}</Route>
      <Route path="/lojista/metricas">{() => <LojistaPrivateRoute component={LojistaMetricas} />}</Route>
      <Route path="/lojista/avaliacoes">{() => <LojistaPrivateRoute component={LojistaAvaliacoes} />}</Route>
      <Route path="/lojista/boost">{() => <LojistaPrivateRoute component={LojistaBoost} />}</Route>
      <Route path="/lojista/assinaturas">{() => <Redirect to="/lojista/plano" />}</Route>
      <Route path="/lojista/documentacao">{() => <LojistaPrivateRoute component={LojistaDocumentacao} />}</Route>
      <Route path="/lojista/plano">{() => <LojistaPrivateRoute component={LojistaPlano} />}</Route>
      <Route path="/lojista/senha">{() => <LojistaPrivateRoute component={LojistaSenha} />}</Route>
      <Route path="/lojista/suporte">{() => <LojistaPrivateRoute component={LojistaSuporte} />}</Route>
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
