import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

interface Props {
    element: React.ReactNode;
    roles?: string[];
}

export const ProtectedRoute: React.FC<Props> = ({ element, roles }) => {
    const token = useSelector((state: any) => state.login.token);
    const profile = useSelector((state: any) => state.profile?.profile);

    if (!token) return <Navigate to="/" replace />;

    if (roles && roles.length > 0 && profile?.role) {
        if (!roles.includes(profile.role)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{element}</>;
};

export const PublicRoute: React.FC<Props> = ({ element }) => {
    const token = useSelector((state: any) => state.login.token);
    return token ? <Navigate to="/dashboard" replace /> : <>{element}</>;
};
