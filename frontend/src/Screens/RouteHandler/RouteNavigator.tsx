import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

interface Props {
    element: React.ReactNode;
}

export const ProtectedRoute: React.FC<Props> = ({ element }) => {
    const token = useSelector((state: any) => state.login.token);
    if (!token) return <Navigate to="/" replace />;
    return <>{element}</>;
};

export const PublicRoute: React.FC<Props> = ({ element }) => {
    const token = useSelector((state: any) => state.login.token);
    return token ? <Navigate to="/dashboard" replace /> : <>{element}</>;
};
