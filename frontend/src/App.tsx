import { useState } from "react";
import "./App.css";
import { Login } from "./Screens/Login";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { Register } from "./Screens/Register";
import { QueryClient, QueryClientProvider } from "react-query";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app">
          <Routes>
            <Route path={"/"} element={<Login currentLanguage="en" />} />
            <Route
              path={"/register"}
              element={<Register currentLanguage="en" />}
            />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
