import { useEffect, useState } from 'react';
import { getDashboardSummary } from '../../api';
import type { DashboardSummary } from '../../api';

export function DashboardView({ showFinance }: { showFinance: boolean }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null); const [error, setError] = useState('');
  useEffect(() => { getDashboardSummary().then(setSummary).catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen')); }, []);
  if (error) return <section className="dashboard-view"><DashboardHeading /><p className="error-message">{error}</p></section>;
  if (!summary) return <section className="dashboard-view"><DashboardHeading /><section className="metric-grid">{Array.from({ length: showFinance ? 4 : 2 }, (_, index) => <div className="metric-card dashboard-skeleton" key={index}>Cargando…</div>)}</section></section>;
  const totalAttendance = summary.attendance.present + summary.attendance.late + summary.attendance.absent; const attendanceRate = totalAttendance ? Math.round((summary.attendance.present / totalAttendance) * 100) : 0;
  const finance = showFinance && summary.pendingCharges !== undefined && summary.overdueCharges !== undefined;
  return <section className="dashboard-view"><DashboardHeading /><section className="metric-grid"><div className="metric-card"><span>Estudiantes activos</span><strong>{summary.activeStudents}</strong><small>{showFinance ? 'Personas con matrícula activa' : 'Matriculados en tus grupos'}</small></div><div className="metric-card"><span>Grupos activos</span><strong>{summary.groups}</strong><small>{showFinance ? 'Clases actualmente disponibles' : 'Clases que tienes asignadas'}</small></div>{finance && <><div className="metric-card warning"><span>Cobros pendientes</span><strong>{summary.pendingCharges}</strong><small>Requieren seguimiento</small></div><div className="metric-card danger"><span>Cobros vencidos</span><strong>{summary.overdueCharges}</strong><small>Fuera de la fecha límite</small></div></>}</section><section className="panel dashboard-attendance"><div><p className="eyebrow">Asistencia</p><h2>Resumen de clases</h2><p className="muted">{showFinance ? 'Datos de las sesiones registradas.' : 'Datos de las sesiones de tus grupos.'}</p></div><div className="attendance-summary"><strong>{attendanceRate}%</strong><span>asistencia registrada</span><small>{summary.attendance.sessions} sesiones · {summary.attendance.present} presentes · {summary.attendance.late} tardías · {summary.attendance.absent} ausentes</small></div></section></section>;
}

function DashboardHeading() { return <div className="page-heading dashboard-heading"><div><p className="eyebrow">Vista general</p><h1>Resumen</h1><p className="muted">Indicadores actualizados desde SIGA.</p></div><span className="live-indicator"><i /> Datos en vivo</span></div>; }
