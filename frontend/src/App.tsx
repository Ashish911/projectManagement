import { Login } from "./Screens/Auth/Login.tsx";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { Register } from "./Screens/Auth/Register.tsx";
import { QueryClient, QueryClientProvider } from "react-query";
import store from "@/redux/store/store.ts"
import { Provider } from "react-redux";
import { Dashboard } from "@/Screens/Dashboard/Dashboard.tsx";
import { Account } from "@/Screens/Dashboard/Account.tsx";
import { Users } from "@/Screens/Dashboard/Users.tsx";
import { Clients } from "@/Screens/Dashboard/Clients.tsx";
import { Projects } from "@/Screens/Dashboard/Projects.tsx";
import { ProjectDetail } from "@/Screens/Dashboard/ProjectDetail.tsx";
import { Tasks } from "@/Screens/Dashboard/Tasks.tsx";
import { Analytics } from "@/Screens/Dashboard/Analytics.tsx";
import { Guide } from "@/Screens/Dashboard/Guide.tsx";
import { ForgotPassword } from "@/Screens/Auth/ForgotPassword.tsx";
import { ResetPassword } from "@/Screens/Auth/ResetPassword.tsx";
import { ProtectedRoute, PublicRoute } from "@/Screens/RouteHandler/RouteNavigator.tsx";
import { AppLayout } from "@/Screens/Components/AppLayout.tsx";
import { analyticsRoles } from "@/Screens/Components/app-sidebar.tsx";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <Router>
          <div className="app">
            <Routes>
              <Route path="/"                element={<PublicRoute element={<Login />} />} />
              <Route path="/register"        element={<PublicRoute element={<Register />} />} />
              <Route path="/forgot-password" element={<PublicRoute element={<ForgotPassword />} />} />
              <Route path="/reset-password"  element={<PublicRoute element={<ResetPassword />} />} />
              {/* Signed-in pages share one layout, so the sidebar stays mounted between them */}
              <Route element={<ProtectedRoute element={<AppLayout />} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/account"   element={<Account />} />
                <Route path="/users"     element={<ProtectedRoute roles={["SUPER_ADMIN"]} element={<Users />} />} />
                <Route path="/clients"   element={<ProtectedRoute roles={["SUPER_ADMIN", "CLIENT_ADMIN"]} element={<Clients />} />} />
                <Route path="/projects"  element={<ProtectedRoute roles={["SUPER_ADMIN", "CLIENT_ADMIN", "USER"]} element={<Projects />} />} />
                <Route path="/projects/:id" element={<ProtectedRoute roles={["SUPER_ADMIN", "CLIENT_ADMIN", "USER"]} element={<ProjectDetail />} />} />
                <Route path="/tasks"     element={<ProtectedRoute roles={["SUPER_ADMIN", "CLIENT_ADMIN", "USER"]} element={<Tasks />} />} />
                {/* The Tasks board replaced the Kanban page */}
                <Route path="/kanban"    element={<Navigate to="/tasks" replace />} />
                <Route path="/analytics" element={<ProtectedRoute roles={analyticsRoles()} element={<Analytics />} />} />
                {/* Help for the signed-in user's role */}
                <Route path="/guide"     element={<Guide />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </Provider>
    </QueryClientProvider>
  );
}

export default App;
