import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { assignStudentToGroup, assignTeacherToGroup, createDiscipline, createGroup, deactivateDiscipline, deactivateGroup, getDisciplines, getGroups, getInternalUsers, getStudents, updateGroup, withdrawStudentFromGroup } from '../../api';
import type { Discipline, Group, Student, User } from '../../api';

export function GroupsView() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [showDisciplineForm, setShowDisciplineForm] = useState(false);
  const [assigning, setAssigning] = useState<Group | null>(null);
  const [error, setError] = useState('');

  function load() {
    return Promise.all([getGroups(), getDisciplines(), getStudents(), getInternalUsers()]).then(([loadedGroups, loadedDisciplines, loadedStudents, loadedUsers]) => {
      setGroups(loadedGroups);
      setDisciplines(loadedDisciplines);
      setStudents(loadedStudents);
      setTeachers(loadedUsers.filter((user) => user.role === 'PROFESOR' || user.role === 'COREOGRAFO'));
    }).catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los grupos'));
  }

  useEffect(() => { void load(); }, []);

  async function deactivateOneDiscipline(id: string) {
    if (!window.confirm('¿Desactivar esta disciplina? Los grupos dejarán de aparecer en las listas activas.')) return;
    try { await deactivateDiscipline(id); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo desactivar la disciplina'); }
  }

  async function deactivateOneGroup(id: string) {
    if (!window.confirm('¿Desactivar este grupo? Las sesiones de asistencia ya guardadas se conservan.')) return;
    try { await deactivateGroup(id); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo desactivar el grupo'); }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Programación académica</p>
          <h1>Disciplinas y grupos</h1>
          <p className="muted">Organiza las clases y sus espacios.</p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={() => setShowDisciplineForm(true)}>+ Disciplina</button>
          <button className="primary-button" onClick={() => { setEditing(null); setShowForm(true); }}>+ Nuevo grupo</button>
        </div>
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="discipline-list">
        {disciplines.map((discipline) => (
          <span className="discipline-pill" key={discipline.id}>
            {discipline.name}
            <button type="button" aria-label={`Desactivar ${discipline.name}`} onClick={() => void deactivateOneDiscipline(discipline.id)}>×</button>
          </span>
        ))}
      </div>
      <section className="group-grid">
        {groups.length === 0 ? <p className="empty-state">No hay grupos registrados.</p> : groups.map((group) => (
          <article className="group-card" key={group.id}>
            <div className="group-card-top"><span className="discipline-tag">{group.discipline.name}</span><span className="status status-active">ACTIVO</span></div>
            <h2>{group.name}</h2>
            <p className="muted">{group.dayOfWeek != null ? `Día ${group.dayOfWeek} · ` : ''}{group.startTime || 'Horario pendiente'}{group.endTime ? ` – ${group.endTime}` : ''}</p>
            <p className="group-meta">{group.location || 'Espacio pendiente'} · {group.students.length} estudiantes</p>
            <div className="group-assignments">
              <span>{group.teachers.length} docentes asignados</span>
              <button className="secondary-button" onClick={() => setAssigning(group)}>Gestionar asignaciones</button>
              <button className="ghost-button" onClick={() => { setEditing(group); setShowForm(true); }}>Editar</button>
              <button className="danger-button" onClick={() => void deactivateOneGroup(group.id)}>Desactivar</button>
            </div>
          </article>
        ))}
      </section>
      {showForm && <GroupForm group={editing} disciplines={disciplines} onClose={() => setShowForm(false)} onCreated={async (group) => { setGroups((current) => editing ? current.map((item) => item.id === group.id ? group : item) : [...current, group]); setShowForm(false); }} />}
      {showDisciplineForm && <DisciplineForm onClose={() => setShowDisciplineForm(false)} onCreated={(discipline) => { setDisciplines((current) => [...current, discipline]); setShowDisciplineForm(false); }} />}
      {assigning && <AssignmentForm group={assigning} students={students} teachers={teachers} onClose={() => setAssigning(null)} onAssigned={async () => { setAssigning(null); setGroups(await getGroups()); }} />}
    </>
  );
}

function AssignmentForm({ group, students, teachers, onClose, onAssigned }: { group: Group; students: Student[]; teachers: User[]; onClose: () => void; onAssigned: () => Promise<void> }) {
  const [studentId, setStudentId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const availableStudents = students.filter((student) => student.enrollmentStatus !== 'INACTIVE' && !group.students.some((item) => item.student.id === student.id));

  async function assignStudent() {
    if (!studentId) return;
    setSaving(true);
    try { await assignStudentToGroup(group.id, studentId); await onAssigned(); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo asignar el estudiante'); } finally { setSaving(false); }
  }

  async function withdraw(id: string) {
    if (!window.confirm('¿Retirar a este estudiante del grupo? La asistencia ya registrada se conserva.')) return;
    setSaving(true);
    try { await withdrawStudentFromGroup(group.id, id); await onAssigned(); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo retirar al estudiante'); } finally { setSaving(false); }
  }

  async function assignTeacher() {
    if (!teacherId) return;
    setSaving(true);
    try { await assignTeacherToGroup(group.id, teacherId); await onAssigned(); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo asignar el docente'); } finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div><p className="eyebrow">{group.name}</p><h2>Asignaciones</h2></div>
          <button className="close-button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="assignment-block">
          <strong>Estudiantes matriculados</strong>
          {group.students.length === 0 ? <p className="muted">Nadie está matriculado ahora.</p> : group.students.map(({ student }) => (
            <div className="member-row" key={student.id}>
              <span>{student.firstName} {student.lastName}</span>
              <button className="ghost-button" disabled={saving} onClick={() => void withdraw(student.id)}>Retirar</button>
            </div>
          ))}
        </div>
        <div className="assignment-block">
          <strong>Agregar estudiante</strong>
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            <option value="">Selecciona un estudiante…</option>
            {availableStudents.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>)}
          </select>
          <button className="primary-button" disabled={saving || !studentId} onClick={() => void assignStudent()}>Asignar estudiante</button>
        </div>
        <div className="assignment-block">
          <strong>Agregar profesor o coreógrafo</strong>
          <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
            <option value="">Selecciona un docente…</option>
            {teachers.filter((teacher) => !group.teachers.some((item) => item.user.id === teacher.id)).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.role}</option>)}
          </select>
          <button className="primary-button" disabled={saving || !teacherId} onClick={() => void assignTeacher()}>Asignar docente</button>
        </div>
        {error && <p className="error-message">{error}</p>}
        <button className="secondary-button full-button" onClick={onClose}>Cerrar</button>
      </section>
    </div>
  );
}

function DisciplineForm({ onClose, onCreated }: { onClose: () => void; onCreated: (discipline: Discipline) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try { onCreated(await createDiscipline(name)); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear la disciplina'); } finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div><p className="eyebrow">Catálogo académico</p><h2>Nueva disciplina</h2></div>
          <button className="close-button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <form onSubmit={submit} className="stack-form">
          <label>Nombre<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} placeholder="Ej. Ballet clásico" /></label>
          {error && <p className="error-message">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
            <button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar disciplina'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function GroupForm({ group, disciplines, onClose, onCreated }: { group: Group | null; disciplines: Discipline[]; onClose: () => void; onCreated: (group: Group) => Promise<void> }) {
  const [name, setName] = useState(group?.name || '');
  const [disciplineId, setDisciplineId] = useState(group?.discipline.id || disciplines[0]?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState(group?.dayOfWeek?.toString() || '');
  const [startTime, setStartTime] = useState(group?.startTime || '');
  const [endTime, setEndTime] = useState(group?.endTime || '');
  const [location, setLocation] = useState(group?.location || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const data = { name, disciplineId, dayOfWeek: dayOfWeek ? Number(dayOfWeek) : undefined, startTime: startTime || undefined, endTime: endTime || undefined, location: location || undefined };
      await onCreated(group ? await updateGroup(group.id, data) : await createGroup(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el grupo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div><p className="eyebrow">Programación</p><h2>{group ? 'Editar grupo' : 'Nuevo grupo'}</h2></div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        {disciplines.length === 0 ? <p className="error-message">Primero crea una disciplina.</p> : (
          <form onSubmit={submit} className="stack-form">
            <div className="form-grid">
              <label>Nombre del grupo<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} /></label>
              <label>Disciplina<select value={disciplineId} onChange={(event) => setDisciplineId(event.target.value)}>{disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select></label>
              <label>Día<select value={dayOfWeek} onChange={(event) => setDayOfWeek(event.target.value)}><option value="">Sin definir</option><option value="1">Lunes</option><option value="2">Martes</option><option value="3">Miércoles</option><option value="4">Jueves</option><option value="5">Viernes</option><option value="6">Sábado</option><option value="0">Domingo</option></select></label>
              <label>Inicio<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
              <label>Fin<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
              <label>Espacio<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
            </div>
            {error && <p className="error-message">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
              <button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar grupo'}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
