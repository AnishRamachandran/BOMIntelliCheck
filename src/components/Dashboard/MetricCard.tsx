import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'green' | 'orange' | 'blue' | 'purple';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const colorClasses = {
  green: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30',
  orange: 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-500/30',
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30',
  purple: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 shadow-fuchsia-500/30'
};

export function MetricCard({ title, value, icon: Icon, color, trend }: MetricCardProps) {
  return (
    <div className={`${colorClasses[color]} rounded-2xl p-6 text-white shadow-lg transition-transform hover:scale-105`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-white/90 text-sm font-medium mb-2">
            <Icon size={16} />
            <span>{title}</span>
          </div>
          <div className="text-4xl font-bold mb-1">{value}</div>
          {trend && (
            <div className="flex items-center gap-1 text-sm text-white/80">
              <span>Last 8 Weeks</span>
              <span className={`ml-2 font-semibold ${trend.isPositive ? 'text-white' : 'text-white/60'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
