import "./App.css";
import { Login } from "./Screens/Auth/Login.tsx";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Register } from "./Screens/Auth/Register.tsx";
import { QueryClient, QueryClientProvider } from "react-query";
import store from "@/redux/store/store.ts"
import { Provider } from "react-redux";
import { Dashboard } from "@/Screens/Dashboard/Dashboard.tsx";
import { Account } from "@/Screens/Dashboard/Account.tsx";
import { Users } from "@/Screens/Dashboard/Users.tsx";
import { Clients } from "@/Screens/Dashboard/Clients.tsx";
import { Projects } from "@/Screens/Dashboard/Projects.tsx";
import { Tasks } from "@/Screens/Dashboard/Tasks.tsx";
import { ProtectedRoute, PublicRoute } from "@/Screens/RouteHandler/RouteNavigator.tsx";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <Router>
          <div className="app">
            <Routes>
              <Route path="/"          element={<PublicRoute element={<Login />} />} />
              <Route path="/register"  element={<PublicRoute element={<Register />} />} />
              <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
              <Route path="/account"   element={<ProtectedRoute element={<Account />} />} />
              <Route path="/users"     element={<ProtectedRoute element={<Users />} />} />
              <Route path="/clients"   element={<ProtectedRoute element={<Clients />} />} />
              <Route path="/projects"  element={<ProtectedRoute element={<Projects />} />} />
              <Route path="/tasks"     element={<ProtectedRoute element={<Tasks />} />} />
            </Routes>
          </div>
        </Router>
      </Provider>
    </QueryClientProvider>
  );
}

export default App;
