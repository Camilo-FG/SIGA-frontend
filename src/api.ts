const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
export type Role = 'DIRECTOR_GENERAL' | 'DIRECTOR_ADMINISTRATIVO' | 'ASISTENTE_DIRECCION' | 'COREOGRAFO' | 'PROFESOR';
export type User = { id: string; email: string; name: string; role: Role };
export type AuthResponse = { accessToken: string; user: User };
export type Student = { id: string; firstName: string; lastName: string; birthDate?: string; email?: string; phone?: string; enrollmentStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING' };
export type Discipline = { id: string; name: string; active: boolean };
export type Group = { id: string; name: string; location?: string; dayOfWeek?: number; startTime?: string; endTime?: string; discipline: Discipline; teachers: { user: User }[]; students: { student: Student }[] };
export type AttendanceStatus = 'PRESENTE' | 'AUSENTE' | 'TARDIA';
export type AttendanceSession = { id: string; groupId: string; date: string; records: { studentId: string; status: AttendanceStatus; student: Student }[] };
export type Charge = { id: string; studentId: string; concept: string; amount: string | number; period: string; dueDate?: string; status: 'PENDIENTE' | 'PAGADO' | 'VENCIDO' | 'CANCELADO'; student: Student; payments: Payment[] };
export type Payment = { id: string; amount: string | number; receiptUrl?: string; receiptStatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'; reference?: string };
export type DashboardSummary = { activeStudents: number; groups: number; pendingCharges: number; overdueCharges: number; attendance: { sessions: number; present: number; late: number; absent: number } };
const tokenKey = 'siga.accessToken';
export const getToken = () => sessionStorage.getItem(tokenKey);
export const setToken = (token: string) => sessionStorage.setItem(tokenKey, token);
export const clearToken = () => sessionStorage.removeItem(tokenKey);
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...options.headers } });
  if (!response.ok) { const body = await response.json().catch(() => null) as { message?: string | string[] } | null; const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message; throw new Error(message || 'No se pudo completar la solicitud'); }
  return response.json() as Promise<T>;
}
export const login = (email: string, password: string) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getMe = () => request<User>('/auth/me');
export const getStudents = (search = '') => request<Student[]>(`/students${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const createStudent = (data: Omit<Student, 'id'>) => request<Student>('/students', { method: 'POST', body: JSON.stringify(data) });
export const deactivateStudent = (id: string) => request<Student>(`/students/${id}`, { method: 'DELETE' });
export const getDisciplines = () => request<Discipline[]>('/disciplines');
export const createDiscipline = (name: string) => request<Discipline>('/disciplines', { method: 'POST', body: JSON.stringify({ name }) });
export const getGroups = () => request<Group[]>('/groups');
export const createGroup = (data: { name: string; disciplineId: string; dayOfWeek?: number; startTime?: string; endTime?: string; location?: string }) => request<Group>('/groups', { method: 'POST', body: JSON.stringify(data) });
export const getAttendance = (groupId: string) => request<AttendanceSession[]>(`/attendance?groupId=${encodeURIComponent(groupId)}`);
export const recordAttendance = (data: { groupId: string; date: string; records: { studentId: string; status: AttendanceStatus }[] }) => request<AttendanceSession>('/attendance', { method: 'POST', body: JSON.stringify(data) });
export const getCharges = () => request<Charge[]>('/payments/charges');
export const createCharge = (data: { studentId: string; concept: string; amount: number; period: string; dueDate?: string }) => request<Charge>('/payments/charges', { method: 'POST', body: JSON.stringify(data) });
export const createPayment = (data: { chargeId: string; amount: number; reference?: string; receiptUrl?: string }) => request<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) });
export const reviewReceipt = (id: string, status: 'APROBADO' | 'RECHAZADO') => request<Payment>(`/payments/${id}/receipt`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const getDashboardSummary = () => request<DashboardSummary>('/dashboard/summary');
