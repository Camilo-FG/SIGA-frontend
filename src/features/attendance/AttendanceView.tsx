import { useEffect, useState } from 'react';
import { getAttendance, getGroups, getRoster, recordAttendance } from '../../api';
import type { AttendanceStatus, Group, Student } from '../../api';

export function AttendanceView() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [history, setHistory] = useState<{ total: number; present: number; late: number; absent: number; attendanceRate: number } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { getGroups().then(setGroups).catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los grupos')); }, []);

  useEffect(() => {
    if (!groupId) return;
    getAttendance(groupId).then((response) => {
      setHistory(response.summary);
      const session = response.sessions.find((item) => item.date.slice(0, 10) === date);
      setStatuses(Object.fromEntries(session?.records.map((record) => [record.studentId, record.status]) || []));
    }).catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo cargar la asistencia'));
    getRoster(groupId, date).then(setRoster).catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo cargar la matrícula'));
  }, [groupId, date]);

  function setStatus(studentId: string, status: AttendanceStatus) { setStatuses((current) => ({ ...current, [studentId]: status })); }

  async function save() {
    if (!groupId || roster.length === 0) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await recordAttendance({ groupId, date, records: roster.map((student) => ({ studentId: student.id, status: statuses[student.id] || 'AUSENTE' })) });
      setMessage('Asistencia guardada correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la asistencia');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Registro de clase</p>
          <h1>Asistencia</h1>
          <p className="muted">Pasa lista con quienes están matriculados en la fecha elegida.</p>
        </div>
        <button className="primary-button" disabled={!groupId || roster.length === 0 || saving} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar asistencia'}</button>
      </div>
      <section className="panel attendance-panel">
        <div className="attendance-filters">
          <label>Grupo<select value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Selecciona un grupo</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.discipline.name} · {item.name}</option>)}</select></label>
          <label>Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        </div>
        {history && <div className="attendance-history"><strong>{history.attendanceRate}%</strong><span>asistencia histórica · {history.total} registros · {history.present} presentes · {history.late} tardías · {history.absent} ausentes</span></div>}
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
        {!groupId ? <p className="empty-state">Selecciona un grupo para comenzar.</p> : roster.length === 0 ? <p className="empty-state">No hay estudiantes matriculados en esta fecha.</p> : (
          <div className="attendance-list">
            {roster.map((student) => (
              <div className="attendance-row" key={student.id}>
                <strong>{student.firstName} {student.lastName}</strong>
                <div className="attendance-actions">
                  {(['PRESENTE', 'TARDIA', 'AUSENTE'] as AttendanceStatus[]).map((status) => (
                    <button key={status} className={statuses[student.id] === status ? `attendance-${status.toLowerCase()} selected` : `attendance-${status.toLowerCase()}`} onClick={() => setStatus(student.id, status)}>{status === 'PRESENTE' ? 'Presente' : status === 'TARDIA' ? 'Tardía' : 'Ausente'}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
