const API_BASE_URL = 'http://localhost:5000/api';

interface ApiFetchOptions extends RequestInit {}

// Helper to perform the refresh token call
const refreshToken = async (): Promise<string | null> => {
    const currentRefreshToken = localStorage.getItem('refreshToken');
    if (!currentRefreshToken) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });

        if (!response.ok) {
            throw new Error('Refresh token failed');
        }

        const { accessToken, refreshToken: newRefreshToken } = await response.json();
        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
             localStorage.setItem('refreshToken', newRefreshToken);
        }
        return accessToken;
    } catch (error) {
        console.error("Could not refresh token:", error);
        // Clear tokens if refresh fails
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Force logout by reloading the page. AuthContext will see no tokens and show login.
        window.location.reload(); 
        return null;
    }
};

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export const apiFetch = async <T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> => {
    const token = localStorage.getItem('accessToken');
    const headers = new Headers(options.headers);

    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const fetchOptions: ApiFetchOptions = {
        ...options,
        headers,
    };

    let response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

    if (response.status === 401) {
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = refreshToken();
        }

        const newAccessToken = await refreshPromise;
        isRefreshing = false;
        refreshPromise = null;

        if (newAccessToken) {
            // Retry the original request with the new token
            headers.set('Authorization', `Bearer ${newAccessToken}`);
            const retryOptions: ApiFetchOptions = { ...fetchOptions, headers };
            response = await fetch(`${API_BASE_URL}${endpoint}`, retryOptions);
        } else {
             // If refresh fails, we will have been redirected, but throw to stop current execution
            throw new Error("Session expired. Please log in again.");
        }
    }

    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const errorBody = await response.json();
            if (errorBody && errorBody.message) {
                errorMessage = errorBody.message;
            }
        } catch (e) {
            // The response might not be JSON, keep the default error message
        }
        throw new Error(errorMessage);
    }
    
    // Handle 204 No Content
    if (response.status === 204) {
        return {} as T;
    }
    
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return response.json();
    }
    
    return {} as T;
};
