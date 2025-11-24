import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const validateAuth = async () => {
      if (!apiClient.isAuthenticated()) {
        navigate("/login");
        return;
      }

      try {
        // Validate token with server
        await apiClient.getMe();
        setIsAuthenticated(true);
      } catch (error) {
        // Token is invalid, try to refresh
        try {
          await apiClient.refreshToken();
          setIsAuthenticated(true);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          navigate("/login");
        }
      } finally {
        setIsValidating(false);
      }
    };

    validateAuth();
  }, [navigate]);

  if (isValidating) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10">
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
