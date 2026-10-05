import React from 'react';
import './Input.css';

export const Input = React.forwardRef(({ className = '', error, ...props }, ref) => {
  return (
    <div className="input-wrapper">
      <input
        ref={ref}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export const Label = ({ children, className = '', htmlFor, ...props }) => {
  return (
    <label htmlFor={htmlFor} className={`label ${className}`} {...props}>
      {children}
    </label>
  );
};
