import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createStaffUser, getInternalUsers } from '../../api';
import type { Role, User } from '../../api';

const roleLabels: Record<Role, string> = {
  DIRECTOR_GENERAL: 'Director General',
  DIRECTOR_ADMINISTRATIVO: 'Director Administrativo',
  ASISTENTE_DIRECCION: 'Asistente de Dirección',
  COREOGRAFO: 'Coreógrafo',
  PROFESOR: 'Profesor',
};

const assignableRoles: Role[] = ['PROFESOR', 'COREOGRAFO', 'ASISTENTE_DIRECCION', 'DIRECTOR_ADMINISTRATIVO', 'DIRECTOR_GENERAL'];

export function UsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getInternalUsers().then(setUsers).catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios'));
  }, []);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Dirección general</p>
          <h1>Usuarios</h1>
          <p className="muted">Crea cuentas del personal. El rol no puede superar al de quien lo crea.</p>
        </div>
        <button className="primary-button" onClick={() => setShowForm(true)}>+ Nuevo usuario</button>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <section className="panel">
        {users.length === 0 ? <p className="empty-state">No hay usuarios registrados.</p> : (
          <div className="user-list">
            {users.map((user) => (
              <article className="member-row" key={user.id}>
                <div>
                  <strong>{user.name}</strong>
                  <p className="muted">{user.email}</p>
                </div>
                <span className="status status-active">{roleLabels[user.role]}</span>
              </article>
            ))}
          </div>
        )}
      </section>
      {showForm && <UserForm onClose={() => setShowForm(false)} onCreated={(user) => { setUsers((current) => [...current, user].sort((a, b) => a.name.localeCompare(b.name, 'es'))); setShowForm(false); }} />}
    </>
  );
}

function UserForm({ onClose, onCreated }: { onClose: () => void; onCreated: (user: User) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('PROFESOR');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      onCreated(await createStaffUser({ name, email, password, role }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el usuario');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Cuenta interna</p>
            <h2>Nuevo usuario</h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <form onSubmit={submit} className="stack-form">
          <label>Nombre<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} /></label>
          <label>Correo<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={72} /></label>
          <label>Rol<select value={role} onChange={(event) => setRole(event.target.value as Role)}>{assignableRoles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}</select></label>
          {error && <p className="error-message">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
            <button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Crear usuario'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
