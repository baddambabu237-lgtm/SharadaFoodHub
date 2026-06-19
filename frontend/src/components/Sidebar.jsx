import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, RefreshCw, Users,
  Boxes, Truck, BarChart3, HeadphonesIcon, ChevronRight,
  Tag, ClipboardList, ShoppingCart, User, FileText
} from 'lucide-react';

const customerLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/catalog', label: 'Products', icon: Package },
  { to: '/subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/cart', label: 'Cart', icon: ShoppingCart },
  { to: '/account', label: 'My Account', icon: User },
  { to: '/support', label: 'Support', icon: HeadphonesIcon },
];

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/products', label: 'Products', icon: Tag },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/dispatches', label: 'Orders', icon: Truck },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/support', label: 'Support Tickets', icon: ClipboardList },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
];

const Sidebar = ({ isAdmin }) => {
  const location = useLocation();
  const links = isAdmin ? adminLinks : customerLinks;

  return (
    <aside className="w-60 shrink-0 bg-white dark:bg-warmgray-800 border-r border-warmgray-100 dark:border-warmgray-700 min-h-[calc(100vh-64px)] hidden md:flex flex-col py-4 transition-colors">
      <div className="px-4 mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-warmgray-400 dark:text-warmgray-500">
          {isAdmin ? 'Admin Panel' : 'Customer Portal'}
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {links.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 font-bold'
                  : 'text-warmgray-600 hover:bg-warmgray-50 dark:text-warmgray-400 dark:hover:bg-warmgray-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-warmgray-400 group-hover:text-warmgray-600 dark:group-hover:text-warmgray-300'}`} />
                <span>{label}</span>
              </div>
              {isActive && <ChevronRight className="w-3 h-3 text-brand-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 mt-4 pt-4 border-t border-warmgray-100 dark:border-warmgray-700">
        <div className="bg-brand-50 dark:bg-brand-950/30 rounded-2xl p-3 text-center">
          <p className="text-[10px] font-bold text-brand-700 dark:text-brand-400 mb-1">🌿 Sharadha Foods</p>
          <p className="text-[9px] text-brand-500 dark:text-brand-500">Fresh. Homemade. Delivered.</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
