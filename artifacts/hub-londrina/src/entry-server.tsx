import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router as WouterRouter, Switch, Route } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Categorias from "@/pages/categorias";
import Busca from "@/pages/busca";
import Negocio from "@/pages/negocio";
import Anuncie from "@/pages/anuncie";
import NotFound from "@/pages/not-found";

function makeStaticLocationHook(url: string) {
  const hook = () => [url, () => {}] as [string, (path: string) => void];
  hook.searchHook = () => "";
  return hook;
}

function Routes() {
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

type QueryEntry = { key: unknown[]; data: unknown };

export function render(url: string, prefetchedData?: Record<string, unknown>, extraQueries?: QueryEntry[]) {
  const hook = makeStaticLocationHook(url);

  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  if (prefetchedData?.id) {
    qc.setQueryData([`/api/businesses/${prefetchedData.id}`], prefetchedData);
  }

  if (extraQueries) {
    for (const { key, data } of extraQueries) {
      qc.setQueryData(key, data);
    }
  }

  return renderToString(
    <QueryClientProvider client={qc}>
      <WouterRouter hook={hook}>
        <TooltipProvider>
          <Routes />
        </TooltipProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}
