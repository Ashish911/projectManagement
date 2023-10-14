import { useState } from "react";
import "./App.css";
import { Login } from "./Screens/Login";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { Register } from "./Screens/Register";
import { QueryClient, QueryClientProvider } from "react-query";

const baseUri = "http://localhost:4040/graphql";

const queryKeyFn = (queryKey) => {
  return [baseUri, ...queryKey].join("/");
};

const queryClient = new QueryClient({
  queryKeyFn,
});

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
