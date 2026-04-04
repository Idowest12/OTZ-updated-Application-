/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from '@/src/utils';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Activity,
  ChevronLeft,
  ChevronRight,
  TestTube,
} from 'lucide-react';
import { useState } from 'react';

export type View = 'dashboard' | 'patients' | 'appointments' | 'viral-load' | 'reports' | 'settings';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
}

export function Sidebar({ currentView, onViewChange, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'viral-load', label: 'Viral Load', icon: TestTube },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-slate-100 bg-white transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Activity className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold tracking-tight text-slate-900">
              OTZ Clinic
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                )}
              />
              {!isCollapsed && <span>{item.label}</span>}
              {isActive && !isCollapsed && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <button
          onClick={onLogout}
          className={cn(
            'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-rose-500" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-400 shadow-sm hover:text-slate-600"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
