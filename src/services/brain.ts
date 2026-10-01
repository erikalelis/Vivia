import type { InterpretedItem } from '@/domain/interpret';
import { eventsRepo, peopleRepo, tasksRepo } from '@/services/api';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/types';

// Argentina no usa horario de verano: el offset es fijo.
const AR = '-03:00';

/** Guarda lo que la usuaria ya confirmó en "Contale a VIVIA". */
export async function saveInterpretedItems(items: InterpretedItem[]): Promise<number> {
  const people = await peopleRepo.list();
  const { data: auth } = await supabase.auth.getUser();
  const user_id = auth.user?.id;
  let saved = 0;

  for (const it of items) {
    const person = it.person ? people.find((p) => p.name.toLowerCase() === it.person!.toLowerCase()) : undefined;
    const common = { title: it.title, description: it.description, module: it.module, person_id: person?.id ?? null, recurrence: it.recurrence };

    let taskId: string | null = null;
    let eventId: string | null = null;

    if (it.kind === 'evento' && it.date) {
      const ev = await eventsRepo.create({
        ...common,
        kind: 'evento',
        starts_at: new Date(`${it.date}T${it.time ?? '00:00'}:00${AR}`).toISOString(),
        all_day: !it.time
      });
      eventId = ev.id; saved++;
    } else {
      const task = await tasksRepo.create({
        ...common,
        priority: it.priority,
        due_date: it.date,
        due_time: it.time,
        tags: it.kind === 'nota' ? ['nota'] : [],
        status: 'pendiente'
      } as Partial<Task>);
      taskId = task.id; saved++;
    }

    if (it.reminderDate && user_id) {
      const { error } = await supabase.from('reminders').insert({
        user_id, task_id: taskId, event_id: eventId,
        remind_at: new Date(`${it.reminderDate}T09:00:00${AR}`).toISOString(), message: it.title
      });
      if (error) throw error;
    }
  }
  return saved;
}
