
import React, { useState } from 'react';
import AuthPage from '@/components/Auth/AuthPage';
import Dashboard from '@/components/Dashboard/Dashboard';
import AdminDashboard from '@/components/Dashboard/AdminDashboard';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  const handleAuthSuccess = (email: string,name:string) => {
    setUserEmail(email);
    setUserName(name)
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Show learner dashboard for all other emails
  return <Dashboard userEmail={userEmail} userName={userName}/>;
};

export default Index;
