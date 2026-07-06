"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@shared/types";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function Navbar() {
  const { user, logout, accessToken } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch("http://localhost:4000/api/notifications", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30s
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: string) => {
    try {
      await fetch(`http://localhost:4000/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchNotifications();
    } catch (err) {}
  };

  const markAllAsRead = async () => {
    try {
      await fetch("http://localhost:4000/api/notifications/read-all", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchNotifications();
    } catch (err) {}
  };

  if (!user) return null;

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const getNavItems = () => {
    const common = [
      { name: "Patients", href: "/patients", icon: "🏥" },
      { name: "Appointments", href: "/appointments", icon: "📅" },
    ];

    switch (user.role) {
      case Role.ADMIN:
        return [
          { name: "Dashboard", href: "/admin", icon: "📊" },
          ...common,
          { name: "Staff", href: "/staff", icon: "👨‍⚕️" },
          { name: "Wards", href: "/wards", icon: "🛏️" },
          { name: "Billing", href: "/billing", icon: "💳" },
          { name: "Pharmacy", href: "/pharmacy", icon: "💊" },
          { name: "Inventory", href: "/inventory", icon: "📦" },
          { name: "Queue", href: "/queue", icon: "⏱️" },
        ];
      case Role.DOCTOR:
        return [
          { name: "Dashboard", href: "/doctor", icon: "📊" },
          ...common,
          { name: "Wards", href: "/wards", icon: "🛏️" },
          { name: "Queue", href: "/queue", icon: "⏱️" },
        ];
      case Role.RECEPTIONIST:
        return [
          { name: "Dashboard", href: "/reception", icon: "📊" },
          ...common,
          { name: "Wards", href: "/wards", icon: "🛏️" },
          { name: "Billing", href: "/billing", icon: "💳" },
          { name: "Queue", href: "/queue", icon: "⏱️" },
        ];
      case Role.BILLING_OFFICER:
        return [
          { name: "Billing", href: "/billing", icon: "💳" }
        ];
      case Role.PHARMACIST:
        return [
          { name: "Pharmacy", href: "/pharmacy", icon: "💊" }
        ];
      case Role.NURSE:
        return [...common, { name: "Wards", href: "/wards", icon: "🛏️" }, { name: "Inventory", href: "/inventory", icon: "📦" }, { name: "Queue", href: "/queue", icon: "⏱️" }];
      default:
        return [
          { name: "Portal", href: "/patient", icon: "🏠" },
          { name: "Appointments", href: "/appointments", icon: "📅" },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-neutral-200/60 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
                <span className="text-sm font-bold text-white">M</span>
              </div>
              <span className="text-lg font-bold text-neutral-900 tracking-tight">MediCore</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all ${
                      isActive
                        ? "bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100"
                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                    }`}
                  >
                    <span className="text-sm">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User & Actions */}
          <div className="flex items-center gap-3">
            
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg ring-1 ring-neutral-200 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                    <h3 className="text-sm font-bold text-neutral-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs font-medium text-primary-600 hover:text-primary-800">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-neutral-500">
                        You're all caught up!
                      </div>
                    ) : (
                      <div className="divide-y divide-neutral-100">
                        {notifications.map((n) => (
                          <div key={n.id} className={`p-4 hover:bg-neutral-50 transition-colors flex gap-3 ${!n.isRead ? 'bg-primary-50/30' : ''}`}>
                            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!n.isRead ? 'bg-primary-500' : 'bg-transparent'}`} />
                            <div className="flex-1">
                              <p className="text-sm font-bold text-neutral-900">{n.title}</p>
                              <p className="text-sm text-neutral-600 mt-0.5 line-clamp-2">{n.body}</p>
                              <p className="text-xs text-neutral-400 mt-2">{new Date(n.createdAt).toLocaleTimeString()}</p>
                            </div>
                            {!n.isRead && (
                              <button onClick={() => markAsRead(n.id)} className="text-neutral-400 hover:text-primary-600 focus:outline-none">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2.5 pr-3 border-r border-neutral-200">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-neutral-900 leading-tight">{user.firstName} {user.lastName}</p>
                <p className="text-[11px] text-neutral-500 capitalize leading-tight">{user.role.toLowerCase().replace("_", " ")}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-sm"
            >
              Sign Out
            </button>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-neutral-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 pb-4">
          {navItems.map((item) => (
            <Link key={item.name} href={item.href} onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 rounded-lg">
              <span>{item.icon}</span> {item.name}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
