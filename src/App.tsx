import { useEffect, useState } from 'react';
import { clearToken, getMe, getToken, setToken } from './api';
import type { User } from './api';
import './App.css';
import './groups.css';
import './attendance.css';
import './payments.css';
import './dashboard.css';
import './theme.css';
import './fullscreen.css';
import './purple-theme.css';
import './demo-login.css';
import './guardians.css';
import './assignments.css';
import './payments-form.css';
import './mobile.css';
import './landing.css';
import './contrast.css';
import './landing-motion.css';
import './login.css';
import './admin-shell.css';
import { ToastHost } from './ToastHost';
import { ThemeToggle } from './theme-toggle.tsx';
import { Landing } from './features/landing';
import { GuardiansView } from './features/guardians/GuardiansView';
import { StudentsView } from './features/students/StudentsView';
import { DashboardView } from './features/dashboard/DashboardView';
import { Login } from './features/auth/Login';
import { GroupsView } from './features/groups/GroupsView';
import { AttendanceView } from './features/attendance/AttendanceView';
import { PaymentsView } from './features/payments/PaymentsView';
import { UsersView } from './features/users/UsersView';

const roleLabels: Record<User['role'], string> = { DIRECTOR_GENERAL: 'Director General', DIRECTOR_ADMINISTRATIVO: 'Director Administrativo', ASISTENTE_DIRECCION: 'Asistente de Dirección', COREOGRAFO: 'Coreógrafo', PROFESOR: 'Profesor' };

function App() {
  const [user, setUser] = useState<User | null>(null); const isPrivate = window.location.pathname.startsWith('/app'); const [checking, setChecking] = useState(isPrivate && Boolean(getToken()));
  useEffect(() => { if (!getToken()) return; getMe().then(setUser).catch(clearToken).finally(() => setChecking(false)); }, []);
  if (!isPrivate && window.location.pathname !== '/login') return <><ToastHost /><Landing /></>;
  return <><ToastHost />{checking ? <main className="center-page">Cargando sesión…</main> : !user ? <Login onLogin={(auth) => { setToken(auth.accessToken); window.location.href = '/app'; }} /> : <Dashboard user={user} onLogout={() => { clearToken(); window.location.href = '/login'; }} />}</>;
}

type Section = 'dashboard' | 'students' | 'guardians' | 'groups' | 'attendance' | 'payments' | 'users';

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const isAdmin = user.role === 'DIRECTOR_GENERAL' || user.role === 'DIRECTOR_ADMINISTRATIVO' || user.role === 'ASISTENTE_DIRECCION';
  const showFinance = user.role !== 'PROFESOR' && user.role !== 'COREOGRAFO';
  const sections: { id: Section; label: string }[] = [
    { id: 'dashboard', label: 'Resumen' },
    ...(isAdmin ? [{ id: 'students' as const, label: 'Estudiantes' }, { id: 'guardians' as const, label: 'Encargados' }, { id: 'groups' as const, label: 'Disciplinas y grupos' }] : []),
    { id: 'attendance', label: 'Asistencia' },
    ...(isAdmin ? [{ id: 'payments' as const, label: 'Pagos' }] : []),
    ...(user.role === 'DIRECTOR_GENERAL' ? [{ id: 'users' as const, label: 'Usuarios' }] : []),
  ];
  const [section, setSection] = useState<Section>('dashboard');
  const current = sections.some((item) => item.id === section) ? section : 'dashboard';
  return <div className="app-shell"><aside className="admin-sidebar"><div className="admin-brand"><span className="brand-mark">A</span><div><p className="eyebrow">ADAGIO</p><strong>SIGA</strong></div></div><nav className="section-nav" aria-label="Módulos">{sections.map((item) => <button key={item.id} className={current === item.id ? 'nav-active' : ''} onClick={() => setSection(item.id)}>{item.label}</button>)}</nav></aside><div className="admin-workspace"><header className="topbar"><div><p className="eyebrow">Gestión interna</p><strong>Área administrativa</strong></div><div className="user-menu"><span>{user.name}<small>{roleLabels[user.role]}</small></span><ThemeToggle /><button className="ghost-button" onClick={onLogout}>Salir</button></div></header><main className="content">{current === 'dashboard' ? <DashboardView showFinance={showFinance} /> : current === 'students' ? <StudentsView /> : current === 'guardians' ? <GuardiansView /> : current === 'groups' ? <GroupsView /> : current === 'attendance' ? <AttendanceView /> : current === 'users' ? <UsersView /> : <PaymentsView canManage={user.role === 'DIRECTOR_GENERAL' || user.role === 'DIRECTOR_ADMINISTRATIVO'} />}</main></div></div>;
}

export default App;
