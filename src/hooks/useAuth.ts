import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
        setIsAuthenticated(true);
    } else {
        setIsAuthenticated(false);
    }
  }, []);

  return isAuthenticated;
};