import React from 'react';
import { Outlet } from 'react-router-dom';
import './AuthLayout.css';

export const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <h1 className="auth-brand">AI Interview Preparation</h1>
        <Outlet />
      </div>
    </div>
  );
};
