import { useState, useEffect } from 'react';
import { Employee } from '../types';

/** Validates whether a stored JWT token is present and unexpired */
function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true; // Non-JWT demo token
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && typeof payload.exp === 'number') {
      return Date.now() < payload.exp * 1000;
    }
    return true;
  } catch {
    return false;
  }
}

export function useAuth(employees: Employee[]) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [cachedUser, setCachedUser] = useState<Employee | null>(() => {
    try {
      const savedToken = localStorage.getItem('hrms_auth_token');
      if (!isTokenValid(savedToken)) {
        return null;
      }
      const saved = localStorage.getItem('hrms_current_user') || localStorage.getItem('hrms_authenticated_employee');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const logout = () => {
    setCurrentUserId(null);
    setCachedUser(null);
    try {
      localStorage.removeItem('hrms_user_session');
      localStorage.removeItem('hrms_current_user');
      localStorage.removeItem('hrms_authenticated_employee');
      localStorage.removeItem('hrms_auth_token');
      localStorage.removeItem('hrms_active_tab');
    } catch {}
  };

  // Load from local storage on mount, verifying token presence & validity
  useEffect(() => {
    const saved = localStorage.getItem('hrms_user_session');
    const token = localStorage.getItem('hrms_auth_token');

    if (saved) {
      if (!isTokenValid(token)) {
        // Expired or missing token - clear session cleanly so user sees LoginScreen
        logout();
      } else {
        setCurrentUserId(saved);
      }
    }

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('hrms:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('hrms:unauthorized', handleUnauthorized);
  }, []);

  const login = (id: string, emp?: Employee, token?: string) => {
    setCurrentUserId(id);
    try {
      localStorage.setItem('hrms_user_session', id);
      if (token) {
        localStorage.setItem('hrms_auth_token', token);
      }
      if (emp) {
        setCachedUser(emp);
        localStorage.setItem('hrms_current_user', JSON.stringify(emp));
        localStorage.setItem('hrms_authenticated_employee', JSON.stringify(emp));
      }
    } catch {}
  };

  const foundUser = currentUserId ? employees.find(e => e.id === currentUserId) : null;
  const currentUser = foundUser || (cachedUser && cachedUser.id === currentUserId ? cachedUser : null);

  return {
    currentUser,
    currentUserId,
    login,
    logout,
    isAuthenticated: !!currentUser
  };
}
