const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface LoginResponse {
  message: string;
  user: AuthenticatedUser;
  accessToken: string;
}

interface TagInput {
  name: string;
  color?: string;
}

interface PageTag {
  id: number;
  name: string;
  color: string;
}

interface PageRecord {
  id: number;
  title: string;
  content: string | null;
  aiDesc: string | null;
  image: string | null;
  thumbnail: string | null;
  createdDate?: string;
  parentId: number | null;
  order: number;
  tags: PageTag[];
  createdAt: string;
  updatedAt: string;
}

interface CreatePageInput {
  title: string;
  content?: string | null;
  aiDesc?: string | null;
  image?: string | null;
  thumbnail?: string | null;
  createdDate: string;
  parentId?: number | null;
  order?: number;
  tags?: TagInput[];
}

interface GetPagesParams {
  page?: number;
  limit?: number;
  parentId?: number;
  tag?: string;
  search?: string;
}

interface GetPagesResponse {
  pages: PageRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiError {
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.accessToken = localStorage.getItem("accessToken");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || errorData.error || "API request failed"
      );
    }

    return response.json();
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    this.accessToken = response.accessToken;
    localStorage.setItem("accessToken", response.accessToken);
    localStorage.setItem("user", JSON.stringify(response.user));

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request("api/auth/logout", { method: "POST" });
    } finally {
      this.accessToken = null;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    }
  }

  async getMe() {
    return this.request<AuthenticatedUser>("api/auth/me");
  }

  async refreshToken() {
    const response = await this.request<{ accessToken: string }>(
      "api/auth/refresh",
      {
        method: "POST",
      }
    );

    this.accessToken = response.accessToken;
    localStorage.setItem("accessToken", response.accessToken);
    return response;
  }

  getStoredUser(): AuthenticatedUser | null {
    const userStr = localStorage.getItem("user");
    return userStr ? (JSON.parse(userStr) as AuthenticatedUser) : null;
  }

  isAuthenticated(): boolean {
    return Boolean(this.accessToken);
  }

  async getPages(params: GetPagesParams = {}): Promise<GetPagesResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });

    const endpoint = query.toString()
      ? `api/pages?${query.toString()}`
      : "api/pages";

    return this.request<GetPagesResponse>(endpoint);
  }

  async createPage(payload: CreatePageInput): Promise<PageRecord> {
    return this.request<PageRecord>("api/pages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getPageById(id: number): Promise<PageRecord> {
    return this.request<PageRecord>(`api/pages/${id}`);
  }

  async updatePage(
    id: number,
    payload: Partial<CreatePageInput>
  ): Promise<PageRecord> {
    return this.request<PageRecord>(`api/pages/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async deletePage(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`api/pages/${id}`, {
      method: "DELETE",
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export type {
  LoginRequest,
  LoginResponse,
  AuthenticatedUser,
  PageRecord,
  GetPagesResponse,
  CreatePageInput,
  GetPagesParams,
};
