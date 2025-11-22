/**
 * Dashboard Container Component
 * Main wrapper providing consistent layout structure and spacing
 *
 * Follows Apple's Human Interface Guidelines:
 * - Clear content hierarchy
 * - Consistent spacing (8-point grid)
 * - Responsive layout
 */

import React from 'react';

interface DashboardContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`
      w-full
      min-h-screen
      bg-gradient-to-br from-gray-50 to-gray-100
      dark:from-gray-950 dark:to-gray-900
      px-4 sm:px-6 lg:px-8
      py-6 sm:py-8 lg:py-10
      ${className}
    `}>
      <div className="mx-auto max-w-7xl">
        {children}
      </div>
    </div>
  );
};

export default DashboardContainer;
