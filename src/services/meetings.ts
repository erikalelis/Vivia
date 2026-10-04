import { supabase } from '@/lib/supabase';
import { meetingTitle, validateMeeting, type MeetingResult } from '@/domain/meeting';

export interface SavedMeeting { id: string; title: string; created_at: string; result: MeetingResult }

/** Devuelve null si la tabla todavía no está creada (la app sigue funcionando sin guardar). */
export async function listMeetings(): Promise<SavedMeeting[] | null> {
  try {
    const { data, error } = await supabase.from('meetings').select('id,title,created_at,result').order('created_at', { ascending: false }).limit(50);
    if (error) return null;
    return (data ?? []).flatMap((r: any) => {
      const result = validateMeeting(r.result);
      return result ? [{ id: r.id, title: r.title, created_at: r.created_at, result }] : [];
    });
  } catch { return null; }
}

/** Guarda la reunión. La transcripción solo se guarda si la persona lo elige. */
export async function saveMeeting(result: MeetingResult, withTranscript: boolean): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return false;
    const stored = { ...result, transcript: withTranscript ? result.transcript : '' };
    const { error } = await supabase.from('meetings').insert({ user_id: data.user.id, title: meetingTitle(result, new Date()), result: stored });
    return !error;
  } catch { return false; }
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from('meetings').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteAllMeetings(): Promise<void> {
  const { error } = await supabase.from('meetings').delete().not('id', 'is', null);
  if (error) throw error;
}
