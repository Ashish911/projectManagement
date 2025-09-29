import "./App.css";
import { Login } from "./Screens/Login";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { Register } from "./Screens/Register";
import { QueryClient, QueryClientProvider } from "react-query";
import { store } from "@/redux/store/store.ts"
import {Provider} from "react-redux";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
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
      </Provider>
    </QueryClientProvider>
  );
}

export default App;
