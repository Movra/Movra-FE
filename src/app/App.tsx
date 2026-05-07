import { BrowserRouter } from "react-router-dom";

import { AppProviders } from "./AppProviders";
import { AppRoutes } from "./AppRoutes";

export function App() {
  return (
    <AppProviders>
      <BrowserRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
