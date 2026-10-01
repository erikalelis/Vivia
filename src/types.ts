export type TaskStatus = 'pendiente' | 'en_curso' | 'vencida' | 'pospuesta' | 'completada' | 'cancelada';
export type Priority = 'baja' | 'media' | 'alta';
export type ModuleName = 'general' | 'mia' | 'carrera' | 'proyectos' | 'documentos';

export interface Task {
  id: string; user_id: string; title: string; description: string | null;
  status: TaskStatus; priority: Priority; module: ModuleName;
  person_id: string | null; project_id: string | null;
  due_date: string | null; due_time: string | null; recurrence: string | null;
  tags: string[]; notes: string | null; completed_at: string | null; created_at: string;
}

export interface AppEvent {
  id: string; user_id: string; title: string; description: string | null; kind: string;
  module: ModuleName; starts_at: string; ends_at: string | null; all_day: boolean;
  location: string | null; recurrence: string | null;
}

export interface Reminder {
  id: string; user_id: string; task_id: string | null; event_id: string | null;
  remind_at: string; message: string | null; dismissed_at: string | null;
}

export interface DocumentRow {
  id: string; user_id: string; name: string; storage_path: string; mime_type: string | null;
  size_bytes: number | null; module: ModuleName; category: string | null;
  related_type: string | null; related_id: string | null; metadata: Record<string, unknown>; created_at: string;
}

export interface SchoolPayment {
  id: string; user_id: string; document_id: string | null; institution: string | null; student: string | null;
  period_month: number | null; period_year: number | null; due_date: string | null;
  line_items: { concept: string; amount_cents: string }[];
  total_cents: number | null; share_percent: number; share_cents: number | null;
  payer_name: string | null; message: string | null;
  status: 'pendiente' | 'listo_para_enviar' | 'enviado'; sent_at: string | null;
  needs_review: boolean; created_at: string;
}

export interface Project {
  id: string; user_id: string; name: string; description: string | null;
  status: 'idea' | 'planificado' | 'en_desarrollo' | 'prueba' | 'publicado' | 'pausado' | 'finalizado';
  priority: Priority; due_date: string | null; links: { label: string; url: string }[];
  notes: string | null; next_steps: string | null;
}

export interface CareerItem {
  id: string; user_id: string; kind: string; company: string | null; position: string | null;
  applied_on: string | null; salary: string | null; modality: string | null; location: string | null;
  contact: string | null; status: string; next_action: string | null; notes: string | null;
}

export interface Settings {
  user_id: string; display_name: string | null; payer_name: string; payer_percent: number;
  payer_phone: string | null; payer_channel: string;
}

export interface AutomationRun {
  id: string; automation_id: string; status: 'ok' | 'revision' | 'error'; detail: Record<string, unknown>; created_at: string;
}
export interface Automation {
  id: string; key: string; name: string; description: string | null; trigger: string;
  actions: string[]; enabled: boolean;
}
export interface Person { id: string; name: string; relation: string | null; phone: string | null; notes: string | null }
