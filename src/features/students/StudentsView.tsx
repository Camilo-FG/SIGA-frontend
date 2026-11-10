import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createStudent, deactivateStudent, getCharges, getGroups, getGuardians, getStudent, getStudentAttendance, getStudents, linkGuardian, unlinkGuardian, updateStudent, uploadStudentPhoto } from '../../api';
import type { AttendanceResponse, Charge, Group, Guardian, Student, StudentInput } from '../../api';
import { Pager, usePage } from '../../pager';

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const attendanceLabels = { PRESENTE: 'Presente', AUSENTE: 'Ausente', TARDIA: 'Tardía', JUSTIFICADA: 'Justificada' } as const;

export function StudentsView({ showFinance = true, canEdit = false }: { showFinance?: boolean; canEdit?: boolean }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recordVersion, setRecordVersion] = useState(0);
  async function loadStudents(term = search) { setLoading(true); setError(''); try { setStudents(await getStudents(term)); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar los estudiantes'); } finally { setLoading(false); } }
  useEffect(() => { void loadStudents(''); }, []);
  useEffect(() => {
    if (!selectedId) return;
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape' && !showForm) setSelectedId(null); }
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [selectedId, showForm]);
  async function deactivate(id: string) { if (!window.confirm('¿Desactivar este estudiante?')) return; try { await deactivateStudent(id); if (selectedId === id) setSelectedId(null); await loadStudents(); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo desactivar'); } }
  const studentPage = usePage(students, search);
  return <><div className="page-heading"><div><p className="eyebrow">Administración</p><h1>Estudiantes</h1><p className="muted">Gestiona los expedientes y estados de matrícula.</p></div>{canEdit && <button className="primary-button" onClick={() => { setEditing(null); setShowForm(true); }}>+ Nuevo estudiante</button>}</div><section className="summary-card"><div><span className="summary-label">Estudiantes registrados</span><strong>{students.length}</strong></div><span className="summary-icon">◎</span></section><section className="panel"><div className="toolbar"><div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void loadStudents(); }} placeholder="Buscar por nombre o correo…" /></div><button className="secondary-button" onClick={() => void loadStudents()}>Buscar</button></div>{error && <p className="error-message" role="alert">{error}</p>}{loading ? <p className="empty-state">Cargando estudiantes…</p> : students.length === 0 ? <p className="empty-state">No hay estudiantes que mostrar.</p> : <div className="student-results"><div className="table-wrap"><table><thead><tr><th>Estudiante</th><th>Contacto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{studentPage.slice.map((student) => <tr key={student.id}><td><strong>{student.firstName} {student.lastName}</strong><small>{student.birthDate ? new Date(student.birthDate).toLocaleDateString('es-CR') : 'Fecha no registrada'}</small></td><td>{student.email || '—'}<small>{student.phone || 'Sin teléfono'}</small></td><td><span className={`status status-${student.enrollmentStatus.toLowerCase()}`}>{student.enrollmentStatus}</span></td><td><button className="secondary-button" onClick={() => setSelectedId(student.id)}>Expediente</button>{canEdit && <> <button className="ghost-button" onClick={() => { setEditing(student); setShowForm(true); }}>Editar</button> <button className="danger-button" onClick={() => void deactivate(student.id)}>Desactivar</button></>}</td></tr>)}</tbody></table></div><Pager page={studentPage.page} pages={studentPage.pages} total={studentPage.total} from={studentPage.from} to={studentPage.to} onPage={studentPage.setPage} /></div>}</section>{selectedId && <div className="modal-backdrop record-backdrop" onMouseDown={() => setSelectedId(null)}><section className="modal record-modal" role="dialog" aria-modal="true" aria-label="Expediente del estudiante" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="close-button record-close" onClick={() => setSelectedId(null)} aria-label="Cerrar">×</button><StudentRecord studentId={selectedId} showFinance={showFinance} canEdit={canEdit} reloadToken={recordVersion} onBack={() => setSelectedId(null)} onEdit={(student) => { setEditing(student); setShowForm(true); }} onDeactivate={() => void deactivate(selectedId)} /></section></div>}{showForm && <StudentForm student={editing} onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); setRecordVersion((current) => current + 1); await loadStudents(); }} />}</>;
}

function StudentRecord({ studentId, showFinance, canEdit, reloadToken, onBack, onEdit, onDeactivate }: { studentId: string; showFinance: boolean; canEdit: boolean; reloadToken: number; onBack: () => void; onEdit: (student: Student) => void; onDeactivate: () => void }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [linksVersion, setLinksVersion] = useState(0);
  const [tab, setTab] = useState<'general' | 'encargados' | 'grupos' | 'asistencia' | 'pagos'>('general');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([getStudent(studentId), getGroups(), getStudentAttendance(studentId), getCharges(studentId)])
      .then(([loadedStudent, loadedGroups, loadedAttendance, loadedCharges]) => {
        if (!active) return;
        setStudent(loadedStudent);
        setGroups(loadedGroups.filter((group) => group.students.some((item) => item.student.id === studentId)));
        setAttendance(loadedAttendance);
        setCharges(loadedCharges);
      })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'No se pudo abrir el expediente'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId, reloadToken, linksVersion]);
  return <><div className="page-heading"><div><p className="eyebrow">Expediente</p><h1>{student ? `${student.firstName} ${student.lastName}` : 'Estudiante'}</h1><p className="muted">Datos, encargados, grupos, asistencia y cobros de este estudiante.</p></div><div className="heading-actions"><button className="secondary-button" onClick={onBack}>Volver</button>{canEdit && student && <button className="ghost-button" onClick={() => onEdit(student)}>Editar</button>}{canEdit && student && student.enrollmentStatus !== 'INACTIVE' && <button className="danger-button" onClick={onDeactivate}>Desactivar</button>}</div></div>{error && <p className="error-message" role="alert">{error}</p>}{loading ? <p className="empty-state">Cargando expediente…</p> : student && <><div className="section-nav">{(['general', ...(showFinance ? ['encargados' as const] : []), 'grupos', 'asistencia', ...(showFinance ? ['pagos' as const] : [])] as const).map((item) => <button key={item} className={tab === item ? 'nav-active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div><section className="panel" hidden={tab !== 'general'}><h2>Información personal</h2><p>{student.email || 'Sin correo'} · {student.phone || 'Sin teléfono'}</p><p className="muted">Nacimiento: {student.birthDate ? new Date(student.birthDate).toLocaleDateString('es-CR') : 'No registrada'}{student.age != null ? ` · ${student.age} años` : ''} · Cédula: {student.nationalId || 'Sin cédula'} · Estado: {student.enrollmentStatus}</p><p className="muted">Emergencia: {student.emergencyContactName || 'Sin contacto'}{student.emergencyContactPhone ? ` · ${student.emergencyContactPhone}` : ''}</p>{student.notes && <p className="muted">Observaciones: {student.notes}</p>}{showFinance && <p className="muted">Saldo: ₡{Number(student.balance ?? 0).toLocaleString('es-CR')}</p>}{canEdit && <form className="stack-form" onSubmit={(event) => { event.preventDefault(); const file = (event.currentTarget.elements.namedItem('photo') as HTMLInputElement).files?.[0]; if (file) void uploadStudentPhoto(student.id, file).then(() => setLinksVersion((current) => current + 1)).catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo guardar la foto')); }}><label>Foto del expediente<input name="photo" type="file" accept="image/jpeg,image/png" /></label><button className="secondary-button" type="submit">Guardar foto</button></form>}</section><section className="panel" hidden={tab !== 'encargados'}><h2>Encargados</h2><GuardianLinks student={student} onChanged={() => setLinksVersion((current) => current + 1)} /></section><section className="panel" hidden={tab !== 'grupos'}><h2>Grupos</h2>{groups.length === 0 ? <p className="empty-state">No está asignado a ningún grupo activo.</p> : <div className="table-wrap"><table><thead><tr><th>Grupo</th><th>Disciplina</th><th>Horario</th><th>Espacio</th></tr></thead><tbody>{groups.map((group) => <tr key={group.id}><td>{group.name}</td><td>{group.discipline.name}</td><td>{group.dayOfWeek !== undefined ? dayNames[group.dayOfWeek] : 'Día sin definir'}{group.startTime ? ` · ${group.startTime}` : ''}{group.endTime ? ` – ${group.endTime}` : ''}</td><td>{group.location || 'Espacio pendiente'}</td></tr>)}</tbody></table></div>}</section><section className="panel" hidden={tab !== 'asistencia'}><h2>Asistencia</h2><p className="muted">{attendance?.summary.attendanceRate ?? student.attendanceRate30Days ?? 0}% de asistencia. Presentes y tardías cuentan; las justificadas quedan fuera del porcentaje.</p>{!attendance || attendance.sessions.length === 0 ? <p className="empty-state">No hay sesiones registradas.</p> : <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Grupo</th><th>Marca</th></tr></thead><tbody>{attendance.sessions.map((session) => { const record = session.records.find((item) => item.studentId === studentId); return <tr key={session.id}><td>{new Date(session.date).toLocaleDateString('es-CR')}</td><td>{session.group?.name || 'Grupo'}</td><td>{record ? attendanceLabels[record.status] : 'Sin marca'}</td></tr>; })}</tbody></table></div>}</section>{showFinance && <section className="panel" hidden={tab !== 'pagos'}><h2>Cobros</h2>{charges.length === 0 ? <p className="empty-state">No hay cobros registrados.</p> : <div className="table-wrap"><table><thead><tr><th>Concepto</th><th>Periodo</th><th>Importe</th><th>Estado</th><th>Comprobante</th></tr></thead><tbody>{charges.map((charge) => <tr key={charge.id}><td>{charge.concept}</td><td>{charge.period}</td><td>₡{Number(charge.amount).toLocaleString('es-CR')}</td><td><span className={`status status-${charge.status.toLowerCase()}`}>{charge.status}</span></td><td>{charge.payments[0]?.receiptStatus || 'Sin comprobante'}</td></tr>)}</tbody></table></div>}</section>}</>}</>;
}

function GuardianLinks({ student, onChanged }: { student: Student; onChanged: () => void }) {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [guardianId, setGuardianId] = useState('');
  const [relationship, setRelationship] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { getGuardians().then(setGuardians).catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los encargados')); }, []);
  const linked = new Set(student.guardians?.map((item) => item.guardian.id));
  async function link(event: FormEvent) { event.preventDefault(); if (!guardianId || relationship.trim().length < 2) return; setSaving(true); setError(''); try { await linkGuardian(student.id, guardianId, relationship.trim()); setGuardianId(''); setRelationship(''); onChanged(); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo vincular'); } finally { setSaving(false); } }
  async function unlink(id: string) { if (!window.confirm('¿Quitar este vínculo?')) return; setSaving(true); setError(''); try { await unlinkGuardian(student.id, id); onChanged(); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo quitar el vínculo'); } finally { setSaving(false); } }
  return <div className="linked-students"><strong>Encargados vinculados</strong>{student.guardians?.length ? student.guardians.map(({ guardian, relationship: label }) => <span key={guardian.id}>{guardian.firstName} {guardian.lastName} · {label} <button type="button" className="ghost-button" disabled={saving} onClick={() => void unlink(guardian.id)}>Quitar</button></span>) : <small>Ningún encargado vinculado</small>}<form onSubmit={link} className="stack-form"><label>Vincular encargado existente<select value={guardianId} onChange={(e) => setGuardianId(e.target.value)}><option value="">Selecciona un encargado…</option>{guardians.filter((guardian) => !linked.has(guardian.id)).map((guardian) => <option key={guardian.id} value={guardian.id}>{guardian.firstName} {guardian.lastName}</option>)}</select></label><label>Relación<input value={relationship} onChange={(e) => setRelationship(e.target.value)} minLength={2} maxLength={80} placeholder="Ej. Madre" required /></label><button className="secondary-button" disabled={saving || !guardianId}>{saving ? 'Guardando…' : 'Vincular'}</button></form>{error && <p className="error-message">{error}</p>}</div>;
}

function yearsOld(birthDate: string) {
  const born = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  if (today < new Date(today.getFullYear(), born.getMonth(), born.getDate())) age -= 1;
  return age;
}

function StudentForm({ student, onClose, onSaved }: { student: Student | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ firstName: student?.firstName || '', lastName: student?.lastName || '', email: student?.email || '', phone: student?.phone || '', birthDate: student?.birthDate?.slice(0, 10) || '', nationalId: student?.nationalId || '', notes: student?.notes || '', emergencyContactName: student?.emergencyContactName || '', emergencyContactPhone: student?.emergencyContactPhone || '', enrollmentStatus: student?.enrollmentStatus || 'PENDING' as Student['enrollmentStatus'], guardianId: '', relationship: '' });
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { getGuardians().then(setGuardians).catch(() => undefined); }, []);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const needsGuardian = Boolean(form.birthDate) && yearsOld(form.birthDate) < 18 && !student?.guardians?.length;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (needsGuardian && (!form.guardianId || form.relationship.trim().length < 2)) { setError('Un menor de 18 años debe tener al menos un encargado'); return; }
    setSaving(true); setError('');
    try {
      const data: StudentInput = { firstName: form.firstName, lastName: form.lastName, enrollmentStatus: form.enrollmentStatus, email: form.email || undefined, phone: form.phone || undefined, birthDate: form.birthDate || undefined, nationalId: form.nationalId || undefined, notes: form.notes || undefined, emergencyContactName: form.emergencyContactName || undefined, emergencyContactPhone: form.emergencyContactPhone || undefined, ...(form.guardianId ? { guardians: [{ guardianId: form.guardianId, relationship: form.relationship.trim() }] } : {}) };
      if (student) await updateStudent(student.id, data); else await createStudent(data);
      await onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar'); } finally { setSaving(false); }
  }
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="student-form-title"><div className="modal-heading"><div><p className="eyebrow">Expediente</p><h2 id="student-form-title">{student ? 'Editar estudiante' : 'Nuevo estudiante'}</h2></div><button className="close-button" onClick={onClose} aria-label="Cerrar">×</button></div><form onSubmit={submit} className="stack-form"><div className="form-grid"><label>Nombre<input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required minLength={2} /></label><label>Apellidos<input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required minLength={2} /></label><label>Nacimiento<input type="date" value={form.birthDate} onChange={(e) => update('birthDate', e.target.value)} /></label><label>Cédula<input value={form.nationalId} onChange={(e) => update('nationalId', e.target.value)} maxLength={30} /></label><label>Correo<input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></label><label>Teléfono<input value={form.phone} onChange={(e) => update('phone', e.target.value)} /></label><label>Contacto de emergencia<input value={form.emergencyContactName} onChange={(e) => update('emergencyContactName', e.target.value)} /></label><label>Teléfono de emergencia<input value={form.emergencyContactPhone} onChange={(e) => update('emergencyContactPhone', e.target.value)} /></label><label>Estado<select value={form.enrollmentStatus} onChange={(e) => update('enrollmentStatus', e.target.value)}><option value="PENDING">Pendiente</option><option value="ACTIVE">Activa</option><option value="INACTIVE">Inactiva</option></select></label><label>Observaciones<textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} maxLength={1000} /></label></div>{needsGuardian && <div className="form-grid"><label>Encargado<select value={form.guardianId} onChange={(e) => update('guardianId', e.target.value)} required><option value="">Selecciona un encargado…</option>{guardians.map((guardian) => <option key={guardian.id} value={guardian.id}>{guardian.firstName} {guardian.lastName}</option>)}</select></label><label>Relación<input value={form.relationship} onChange={(e) => update('relationship', e.target.value)} required minLength={2} /></label></div>}<p className="muted">Si el estudiante es menor de 18 años, el expediente exige un encargado.</p>{error && <p className="error-message" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar estudiante'}</button></div></form></section></div>;
}
