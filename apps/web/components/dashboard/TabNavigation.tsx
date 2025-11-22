/**
 * Tab Navigation Component
 * Switcher for different dashboard views
 *
 * Features:
 * - Smooth tab transitions
 * - Active state indicators
 * - Keyboard accessible
 * - Responsive design
 *
 * Apple HIG: Deference - navigation supports content hierarchy
 */

'use client';

import React, { useState, ReactNode } from 'react';
import { glassStyles } from './glass-styles';

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  icon?: ReactNode;
}

export interface TabNavigationProps {
  tabs: Tab[];
  defaultTabId?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  defaultTabId,
  onTabChange,
  className = '',
}) => {
  const [activeTabId, setActiveTabId] = useState(defaultTabId || tabs[0]?.id || '');

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
    onTabChange?.(tabId);
  };

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  return (
    <div className={`
      flex flex-col
      ${className}
    `}>
      {/* Tab Triggers */}
      <div className={`
        flex items-center
        border-b border-gray-200 dark:border-gray-800
        mb-6 sm:mb-8
        overflow-x-auto
      `}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                ${glassStyles.tabs.trigger}
                ${isActive ? glassStyles.tabs.active : ''}
                flex items-center gap-2
                whitespace-nowrap
              `}
              aria-selected={isActive}
              role="tab"
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="
        animate-in
        fade-in
        duration-200
      ">
        {activeTab && (
          <div role="tabpanel" aria-labelledby={activeTabId}>
            {activeTab.content}
          </div>
        )}
      </div>
    </div>
  );
};

// Alternative simpler version without icon support
export interface SimpleTabNavigationProps {
  tabs: Array<{ label: string; content: ReactNode }>;
  defaultTabIndex?: number;
  onTabChange?: (index: number) => void;
  className?: string;
}

export const SimpleTabNavigation: React.FC<SimpleTabNavigationProps> = ({
  tabs,
  defaultTabIndex = 0,
  onTabChange,
  className = '',
}) => {
  const [activeIndex, setActiveIndex] = useState(defaultTabIndex);

  const handleTabChange = (index: number) => {
    setActiveIndex(index);
    onTabChange?.(index);
  };

  return (
    <div className={`
      flex flex-col
      ${className}
    `}>
      {/* Tab Triggers */}
      <div className={`
        flex items-center
        border-b border-gray-200 dark:border-gray-800
        mb-6 sm:mb-8
        overflow-x-auto
      `}>
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              key={index}
              onClick={() => handleTabChange(index)}
              className={`
                ${glassStyles.tabs.trigger}
                ${isActive ? glassStyles.tabs.active : ''}
                whitespace-nowrap
              `}
              aria-selected={isActive}
              role="tab"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="
        animate-in
        fade-in
        duration-200
      ">
        {tabs[activeIndex] && (
          <div role="tabpanel">
            {tabs[activeIndex].content}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabNavigation;
