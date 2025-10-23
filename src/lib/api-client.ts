import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'auditor' | 'viewer';
  lastLogin?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'auditor' | 'viewer';
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth token
    this.client.interceptors.request.use(
      (config: any) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Token management
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', credentials);
    if (response.data.success && response.data.data.token) {
      this.setToken(response.data.data.token);
    }
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', data);
    if (response.data.success && response.data.data.token) {
      this.setToken(response.data.data.token);
    }
    return response.data;
  }

  async logout(): Promise<void> {
    this.clearToken();
  }

  async getMe(): Promise<ApiResponse<User>> {
    const response = await this.client.get<ApiResponse<User>>('/auth/me');
    return response.data;
  }

  async updateDetails(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.client.put<ApiResponse<User>>('/auth/updatedetails', data);
    return response.data;
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    const response = await this.client.put('/auth/updatepassword', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  // Invoice endpoints
  async getInvoices(params?: PaginationParams & {
    status?: string;
    vendor?: string;
    riskLevel?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse> {
    const response = await this.client.get('/invoices', { params });
    return response.data;
  }

  async getInvoice(id: string): Promise<ApiResponse> {
    const response = await this.client.get(`/invoices/${id}`);
    return response.data;
  }

  async processInvoice(file: File, onUploadProgress?: (progress: number) => void): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/invoices/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (progressEvent.total && onUploadProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(percentCompleted);
        }
      },
    });
    return response.data;
  }

  async updateInvoice(id: string, data: any): Promise<ApiResponse> {
    const response = await this.client.put(`/invoices/${id}`, data);
    return response.data;
  }

  async approveInvoice(id: string): Promise<ApiResponse> {
    const response = await this.client.put(`/invoices/${id}/approve`);
    return response.data;
  }

  async rejectInvoice(id: string, reason?: string): Promise<ApiResponse> {
    const response = await this.client.put(`/invoices/${id}/reject`, { reason });
    return response.data;
  }

  async deleteInvoice(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/invoices/${id}`);
    return response.data;
  }

  async getInvoiceStats(): Promise<ApiResponse> {
    const response = await this.client.get('/invoices/stats');
    return response.data;
  }

  // Vendor endpoints
  async getVendors(params?: PaginationParams & {
    search?: string;
    riskLevel?: string;
  }): Promise<ApiResponse> {
    const response = await this.client.get('/vendors', { params });
    return response.data;
  }

  async getVendor(id: string): Promise<ApiResponse> {
    const response = await this.client.get(`/vendors/${id}`);
    return response.data;
  }

  async createVendor(data: any): Promise<ApiResponse> {
    const response = await this.client.post('/vendors', data);
    return response.data;
  }

  async updateVendor(id: string, data: any): Promise<ApiResponse> {
    const response = await this.client.put(`/vendors/${id}`, data);
    return response.data;
  }

  async deleteVendor(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/vendors/${id}`);
    return response.data;
  }

  async getVendorStats(): Promise<ApiResponse> {
    const response = await this.client.get('/vendors/stats');
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
