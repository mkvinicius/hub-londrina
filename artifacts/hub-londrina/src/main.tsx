import { createRoot, hydrateRoot } from "react-dom/client";
import App, { queryClient } from "./App";
import "./index.css";

const ssrData = (window as any).__SSR_DATA__ as Record<string, unknown> | undefined;
const ssrQueries = (window as any).__SSR_QUERIES__ as Array<{ key: unknown[]; data: unknown }> | undefined;

const container = document.getElementById("root")!;

if (ssrData?.id) {
  queryClient.setQueryData([`/api/businesses/${ssrData.id}`], ssrData);
  hydrateRoot(container, <App />);
} else if (ssrQueries?.length) {
  for (const { key, data } of ssrQueries) {
    queryClient.setQueryData(key, data);
  }
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
