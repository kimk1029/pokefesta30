'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FabMenu } from './FabMenu';
import { LoginScreen } from './LoginScreen';
import { Tabbar } from './Tabbar';

const LS_KEY = 'pf30.loggedIn';

export function PhoneShell({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    try {
      setLoggedIn(localStorage.getItem(LS_KEY) === '1');
    } catch {
      setLoggedIn(false);
    }
  }, []);

  const login = () => {
    try {
      localStorage.setItem(LS_KEY, '1');
    } catch {
      /* ignore */
    }
    setLoggedIn(true);
  };

  return (
    <div className="page-wrap">
      <div className="phone">
        {loggedIn === false && <LoginScreen onLogin={login} />}
        <div className="screen">{children}</div>
        {fabOpen && <FabMenu onClose={() => setFabOpen(false)} />}
        <Tabbar onFab={() => setFabOpen((v) => !v)} />
      </div>
    </div>
  );
}
