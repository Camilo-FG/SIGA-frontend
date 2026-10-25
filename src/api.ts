const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
export type Role = 'DIRECTOR_GENERAL' | 'DIRECTOR_ADMINISTRATIVO' | 'ASISTENTE_DIRECCION' | 'COREOGRAFO' | 'PROFESOR';
export type User = { id: string; email: string; name: string; role: Role };
export type AuthResponse = { accessToken: string; user: User };
export type Student = { id: string; firstName: string; lastName: string; birthDate?: string; email?: string; phone?: string; enrollmentStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING' };
export type Guardian = { id: string; firstName: string; lastName: string; email?: string; phone?: string; students: { student: Student; relationship: string }[] };
export type Discipline = { id: string; name: string; active: boolean };
export type Group = { id: string; name: string; location?: string; dayOfWeek?: number; startTime?: string; endTime?: string; discipline: Discipline; teachers: { user: User }[]; students: { student: Student }[] };
export type AttendanceStatus = 'PRESENTE' | 'AUSENTE' | 'TARDIA';
export type AttendanceSession = { id: string; groupId: string; date: string; records: { studentId: string; status: AttendanceStatus; student: Student }[] };
export type Charge = { id: string; studentId: string; concept: string; amount: string | number; period: string; dueDate?: string; status: 'PENDIENTE' | 'PAGADO' | 'VENCIDO' | 'CANCELADO'; student: Student; payments: Payment[] };
export type Payment = { id: string; amount: string | number; receiptUrl?: string; receiptStatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'; reference?: string };
export type DashboardSummary = { activeStudents: number; groups: number; pendingCharges: number; overdueCharges: number; attendance: { sessions: number; present: number; late: number; absent: number } };
const tokenKey = 'siga.accessToken';
import { notify } from './toast';
export const getToken = () => sessionStorage.getItem(tokenKey);
export const setToken = (token: string) => sessionStorage.setItem(tokenKey, token);
export const clearToken = () => sessionStorage.removeItem(tokenKey);
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...options.headers } });
  if (!response.ok) { const body = await response.json().catch(() => null) as { message?: string | string[] } | null; const raw = Array.isArray(body?.message) ? body.message.join(', ') : body?.message; throw new Error(humanizeError(response.status, raw)); }
  return response.json() as Promise<T>;
}
function humanizeError(status: number, raw?: string) {
  if (status === 401) return 'Tu sesión no es válida. Vuelve a iniciar sesión.';
  if (status === 403) return 'No tienes permisos para realizar esta acción.';
  if (status === 404) return 'No encontramos la información solicitada.';
  if (status === 409) return 'Esta información ya existe o la operación ya fue realizada.';
  if (raw?.toLowerCase().includes('invalid email')) return 'El correo o la contraseña no son correctos.';
  if (raw?.toLowerCase().includes('not found')) return 'No encontramos el registro solicitado.';
  if (raw?.toLowerCase().includes('duplicate')) return 'Hay registros repetidos. Revisa la información.';
  return 'No pudimos completar la acción. Revisa los datos e inténtalo de nuevo.';
}
export const login = (email: string, password: string) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getMe = () => request<User>('/auth/me');
export const getStudents = (search = '') => request<Student[]>(`/students${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const createStudent = async (data: Omit<Student, 'id'>) => { const result = await request<Student>('/students', { method: 'POST', body: JSON.stringify(data) }); notify('Estudiante registrado correctamente.'); return result; };
export const deactivateStudent = async (id: string) => { const result = await request<Student>(`/students/${id}`, { method: 'DELETE' }); notify('Estudiante desactivado correctamente.'); return result; };
export const getGuardians = () => request<Guardian[]>('/students/guardians');
export const createGuardian = async (data: { firstName: string; lastName: string; email?: string; phone?: string }) => { const result = await request<Guardian>('/students/guardians', { method: 'POST', body: JSON.stringify(data) }); notify('Encargado registrado correctamente.'); return result; };
export const updateGuardian = async (id: string, data: { firstName: string; lastName: string; email?: string; phone?: string }) => { const result = await request<Guardian>(`/students/guardians/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); notify('Encargado actualizado correctamente.'); return result; };
export const getDisciplines = () => request<Discipline[]>('/disciplines');
export const createDiscipline = async (name: string) => { const result = await request<Discipline>('/disciplines', { method: 'POST', body: JSON.stringify({ name }) }); notify('Disciplina creada correctamente.'); return result; };
export const getGroups = () => request<Group[]>('/groups');
export const getInternalUsers = (role?: 'PROFESOR' | 'COREOGRAFO') => request<User[]>(`/auth/users${role ? `?role=${role}` : ''}`);
export const createGroup = async (data: { name: string; disciplineId: string; dayOfWeek?: number; startTime?: string; endTime?: string; location?: string }) => { const result = await request<Group>('/groups', { method: 'POST', body: JSON.stringify(data) }); notify('Grupo creado correctamente.'); return result; };
export const assignStudentToGroup = async (groupId: string, studentId: string) => { const result = await request(`/groups/${groupId}/students`, { method: 'POST', body: JSON.stringify({ studentId }) }); notify('Estudiante asignado al grupo.'); return result; };
export const assignTeacherToGroup = async (groupId: string, userId: string) => { const result = await request(`/groups/${groupId}/teachers`, { method: 'POST', body: JSON.stringify({ userId }) }); notify('Profesor asignado al grupo.'); return result; };
export const getAttendance = (groupId: string) => request<AttendanceSession[]>(`/attendance?groupId=${encodeURIComponent(groupId)}`);
export const recordAttendance = async (data: { groupId: string; date: string; records: { studentId: string; status: AttendanceStatus }[] }) => { const result = await request<AttendanceSession>('/attendance', { method: 'POST', body: JSON.stringify(data) }); notify('Asistencia guardada correctamente.'); return result; };
export const getCharges = () => request<Charge[]>('/payments/charges');
export const createCharge = async (data: { studentId: string; concept: string; amount: number; period: string; dueDate?: string }) => { const result = await request<Charge>('/payments/charges', { method: 'POST', body: JSON.stringify(data) }); notify('Cobro registrado correctamente.'); return result; };
export const createPayment = (data: { chargeId: string; amount: number; reference?: string; receiptUrl?: string }) => request<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) });
export const reviewReceipt = async (id: string, status: 'APROBADO' | 'RECHAZADO') => { const result = await request<Payment>(`/payments/${id}/receipt`, { method: 'PATCH', body: JSON.stringify({ status }) }); notify(status === 'APROBADO' ? 'Comprobante aprobado.' : 'Comprobante rechazado.', status === 'APROBADO' ? 'success' : 'info'); return result; };
export const getDashboardSummary = () => request<DashboardSummary>('/dashboard/summary');
