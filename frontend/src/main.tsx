import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import App from "./App";
import CustomerDetail from "./pages/CustomerDetail";
import Dashboard from "./pages/Dashboard";
import NewCustomer from "./pages/NewCustomer";
import "./index.css";

// Rutas de la spec 04.
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Dashboard />} />
          <Route path="customers/new" element={<NewCustomer />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
