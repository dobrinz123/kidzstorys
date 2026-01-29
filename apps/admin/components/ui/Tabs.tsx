'use client';

import { createContext, useContext, useState } from 'react';
import { cn } from '../../lib/utils';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// Tabs Root
export interface TabsProps {
  children: React.ReactNode;
  defaultValue: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function Tabs({
  children,
  defaultValue,
  value,
  onChange,
  className,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);

  const activeTab = value ?? internalValue;
  const setActiveTab = (id: string) => {
    setInternalValue(id);
    onChange?.(id);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// Tab List
export function TabList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('tab-list', className)}>{children}</div>;
}

// Tab Trigger
export interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabTrigger({
  value,
  children,
  className,
  disabled = false,
}: TabTriggerProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => !disabled && setActiveTab(value)}
      disabled={disabled}
      className={cn(
        'tab',
        isActive && 'tab-active',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

// Tab Content
export interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabContent({ value, children, className }: TabContentProps) {
  const { activeTab } = useTabs();

  if (activeTab !== value) return null;

  return (
    <div className={cn('mt-4 animate-fade-in', className)}>{children}</div>
  );
}

// Language Tabs (specific for EN/RO/IT)
export interface LanguageTabsProps {
  activeLanguage: 'en' | 'ro' | 'it';
  onChange: (lang: 'en' | 'ro' | 'it') => void;
  className?: string;
}

export function LanguageTabs({
  activeLanguage,
  onChange,
  className,
}: LanguageTabsProps) {
  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ro', label: 'Română', flag: '🇷🇴' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  ] as const;

  return (
    <div className={cn('tab-list', className)}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onChange(lang.code)}
          className={cn(
            'tab flex items-center gap-2',
            activeLanguage === lang.code && 'tab-active'
          )}
        >
          <span>{lang.flag}</span>
          <span>{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
