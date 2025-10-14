import "./App.css";
import { Login } from "./Screens/Login.tsx";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Register } from "./Screens/Register.tsx";
import { QueryClient, QueryClientProvider } from "react-query";
import store from "@/redux/store/store.ts"
import {Provider} from "react-redux";
import { Dashboard } from "@/Screens/Dashboard.tsx";
import { ProtectedRoute, PublicRoute } from "@/Screens/RouteHandler/RouteNavigator.tsx";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <Router>
          <div className="app">
            <Routes>
              <Route path={"/"} element={
                <PublicRoute element={<Login currentLanguage="en" />} />}
                     />
              <Route
                path={"/register"}
                element={<PublicRoute element={<Register currentLanguage="en" />} />}
              />
              <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard currentLanguage="en" />} />} />
            </Routes>
          </div>
        </Router>
      </Provider>
    </QueryClientProvider>
  );
}

export default App;
