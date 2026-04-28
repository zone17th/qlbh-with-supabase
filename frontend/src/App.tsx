import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "./layouts/AppLayout";
import { routes } from "./routes/routes";

function currentHashPath() {
  const hash = window.location.hash.replace(/^#/, "");
  return hash || "/dashboard";
}

export function App() {
  const [path, setPath] = useState(currentHashPath());

  useEffect(() => {
    const onHashChange = () => setPath(currentHashPath());
    window.addEventListener("hashchange", onHashChange);
    if (!window.location.hash) window.location.hash = "/dashboard";
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const route = useMemo(
    () => routes.find((item) => item.path === path) ?? routes[0],
    [path],
  );
  const Page = route.element;

  return (
    <AppLayout activePath={route.path}>
      <Page />
    </AppLayout>
  );
}
