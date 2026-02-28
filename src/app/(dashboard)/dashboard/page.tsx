'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2 } from 'lucide-react';
import FabricanteDashboard from '@/components/dashboard/FabricanteDashboard';
import LojistaDashboard from '@/components/dashboard/LojistaDashboard';

type UserRole = 'lojista' | 'fabricante' | 'admin';

export default function DashboardHome() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('lojista');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        setUserName(profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || '');
        setUserRole((profile?.role as UserRole) || 'lojista');
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    );
  }

  // Role-based dashboard rendering
  if (userRole === 'fabricante' || userRole === 'admin') {
    return <FabricanteDashboard userName={userName} />;
  }

  return <LojistaDashboard userName={userName} />;
}
