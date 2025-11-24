/**
 * Dashboard Header Component
 * Displays page title and optional breadcrumbs
 *
 * Apple HIG: Clarity principle - clear content hierarchy
 */

import React from 'react';
import { glassStyles } from './glass-styles';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  action?: React.ReactNode;
  className?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  action,
  className = '',
}) => {
  return (
    <div className={`
      mb-8 sm:mb-10 lg:mb-12
      ${className}
    `}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4 flex items-center space-x-2">
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <span className="text-gray-400 dark:text-gray-600">/</span>
              )}
              {breadcrumb.href ? (
                <a
                  href={breadcrumb.href}
                  className="text-sm font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                >
                  {breadcrumb.label}
                </a>
              ) : (
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {breadcrumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title Section */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className={`
            ${glassStyles.typography.display}
            text-gray-900 dark:text-white
            mb-2
          `}>
            {title}
          </h1>

          {subtitle && (
            <p className={`
              ${glassStyles.typography.callout}
              text-gray-600 dark:text-gray-400
            `}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Button */}
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;
