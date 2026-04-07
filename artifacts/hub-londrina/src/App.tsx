import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Categorias from "@/pages/categorias";
import Busca from "@/pages/busca";
import Negocio from "@/pages/negocio";
import Anuncie from "@/pages/anuncie";
import { queryClient } from "@/lib/query-client";

export { queryClient };

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/categorias" component={Categorias} />
      <Route path="/busca" component={Busca} />
      <Route path="/negocio/:id" component={Negocio} />
      <Route path="/anuncie" component={Anuncie} />
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
