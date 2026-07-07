import React from 'react';

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={`animate-pulse bg-[var(--border-color)] rounded-md ${className}`}
      {...props}
    />
  );
};

export default Skeleton;
