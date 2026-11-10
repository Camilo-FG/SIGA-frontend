import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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

const roleLabels: Record<User['role'], string> = { DIRECTOR_GENERAL: 'Director General', DIRECTOR_ADMINISTRATIVO: 'Director Administrativo', ASISTENTE_DIRECCION: 'Asistente de Dirección', COREOGRAFO: 'Coreógrafo', PROFESOR: 'Coreógrafo' };
type Section = 'dashboard' | 'students' | 'guardians' | 'groups' | 'attendance' | 'payments' | 'users';
const sectionPath: Record<Section, string> = { dashboard: '/app/resumen', students: '/app/estudiantes', guardians: '/app/encargados', groups: '/app/grupos', attendance: '/app/asistencia', payments: '/app/pagos', users: '/app/usuarios' };

function App() {
  return <BrowserRouter><Shell /></BrowserRouter>;
}

function Shell() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(Boolean(getToken()));
  const location = useLocation();
  useEffect(() => { if (!getToken()) { setChecking(false); return; } getMe().then(setUser).catch(clearToken).finally(() => setChecking(false)); }, []);
  const isPrivate = location.pathname.startsWith('/app');
  if (!isPrivate && location.pathname !== '/login') return <><ToastHost /><Landing /></>;
  if (checking) return <><ToastHost /><main className="center-page">Cargando sesión…</main></>;
  if (!user) return <><ToastHost /><Login onLogin={(auth) => { setToken(auth.accessToken); setUser(auth.user); window.location.href = auth.user.role === 'COREOGRAFO' || auth.user.role === 'PROFESOR' ? '/app/asistencia' : '/app/resumen'; }} /></>;
  if (!isPrivate) return <Navigate to={user.role === 'COREOGRAFO' || user.role === 'PROFESOR' ? '/app/asistencia' : '/app/resumen'} replace />;
  return <><ToastHost /><Routes><Route path="/app/*" element={<Dashboard user={user} onLogout={() => { clearToken(); window.location.href = '/login'; }} />} /></Routes></>;
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isTeacher = user.role === 'COREOGRAFO' || user.role === 'PROFESOR';
  const isAdmin = user.role === 'DIRECTOR_GENERAL' || user.role === 'DIRECTOR_ADMINISTRATIVO' || user.role === 'ASISTENTE_DIRECCION';
  const showFinance = !isTeacher;
  const canValidatePayments = user.role === 'DIRECTOR_ADMINISTRATIVO' || user.role === 'ASISTENTE_DIRECCION';
  const sections: { id: Section; label: string }[] = [
    ...(!isTeacher ? [{ id: 'dashboard' as const, label: 'Resumen' }] : []),
    { id: 'students', label: 'Estudiantes' },
    ...(isAdmin ? [{ id: 'guardians' as const, label: 'Encargados' }, { id: 'groups' as const, label: 'Disciplinas y grupos' }] : [{ id: 'groups' as const, label: 'Mis grupos' }]),
    { id: 'attendance', label: isTeacher ? 'Mis grupos hoy' : 'Asistencia' },
    ...(showFinance ? [{ id: 'payments' as const, label: 'Pagos' }] : []),
    ...(user.role === 'DIRECTOR_GENERAL' || user.role === 'DIRECTOR_ADMINISTRATIVO' ? [{ id: 'users' as const, label: 'Usuarios' }] : []),
  ];
  const current = (Object.entries(sectionPath).find(([, path]) => location.pathname.startsWith(path))?.[0] as Section | undefined) ?? (isTeacher ? 'attendance' : 'dashboard');
  return <div className="app-shell"><aside className="admin-sidebar"><div className="admin-brand"><span className="brand-mark">A</span><div><p className="eyebrow">ADAGIO</p><strong>SIGA</strong></div></div><nav className="section-nav" aria-label="Módulos">{sections.map((item) => <button key={item.id} className={current === item.id ? 'nav-active' : ''} onClick={() => navigate(sectionPath[item.id])}>{item.label}</button>)}</nav></aside><div className="admin-workspace"><header className="topbar"><div><p className="eyebrow">Gestión interna</p><strong>{roleLabels[user.role]}</strong></div><div className="user-menu"><span>{user.name}<small>{roleLabels[user.role]}</small></span><ThemeToggle /><button className="ghost-button" onClick={onLogout}>Salir</button></div></header><main className="content"><Routes><Route path="resumen" element={isTeacher ? <Navigate to="/app/asistencia" replace /> : <DashboardView showFinance={showFinance} />} /><Route path="estudiantes" element={<StudentsView showFinance={showFinance} canEdit={canValidatePayments} />} /><Route path="encargados" element={<GuardiansView />} /><Route path="grupos" element={<GroupsView />} /><Route path="asistencia" element={<AttendanceView teacherHome={isTeacher} />} /><Route path="pagos" element={showFinance ? <PaymentsView canManage={canValidatePayments} /> : <Navigate to="/app/asistencia" replace />} /><Route path="usuarios" element={<UsersView />} /><Route path="*" element={<Navigate to={isTeacher ? '/app/asistencia' : '/app/resumen'} replace />} /></Routes></main></div></div>;
}

export default App;
