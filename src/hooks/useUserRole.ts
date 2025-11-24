import { apiClient } from "@/lib/api";

type UserRole = "ADMIN" | "CONSULTANT" | "STUDENT";

export function useUserRole(): {
  role: UserRole;
  isAdmin: boolean;
  isConsultant: boolean;
  isStudent: boolean;
} {
  const user = apiClient.getStoredUser();
  const role = (user?.role as UserRole) || "STUDENT";

  return {
    role,
    isAdmin: role === "ADMIN",
    isConsultant: role === "CONSULTANT",
    isStudent: role === "STUDENT",
  };
}
