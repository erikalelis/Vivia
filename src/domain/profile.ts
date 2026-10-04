// Lógica pura del perfil profesional (sin red ni React, así se puede probar).

export const PROFILE_SECTIONS = ['experiencia', 'herramientas', 'proyectos', 'logros', 'idiomas', 'conocimientos', 'situaciones', 'fortalezas'] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

export const SECTION_LABEL: Record<ProfileSection, string> = {
  experiencia: 'Experiencia y cargos',
  herramientas: 'Herramientas y sistemas',
  proyectos: 'Proyectos y automatizaciones',
  logros: 'Logros y resultados',
  idiomas: 'Idiomas',
  conocimientos: 'Conocimientos y procesos',
  situaciones: 'Situaciones difíciles resueltas',
  fortalezas: 'Fortalezas y habilidades'
};

export interface ProfileDraft { section: ProfileSection; title: string; detail: string | null }

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** Valida lo que devuelve la IA: descarta secciones inválidas, vacíos y repetidos. Nunca confía en la forma. */
export function validateProfileExtraction(raw: unknown): ProfileDraft[] {
  const list = (raw as { items?: unknown } | null)?.items;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: ProfileDraft[] = [];
  for (const it of list) {
    const r = (it ?? {}) as Record<string, unknown>;
    const section = r.section;
    if (typeof section !== 'string' || !(PROFILE_SECTIONS as readonly string[]).includes(section)) continue;
    const title = clean(r.title, 120);
    if (!title) continue;
    const key = `${section}|${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ section: section as ProfileSection, title, detail: clean(r.detail, 600) || null });
  }
  return out;
}

export function groupBySection<T extends { section: ProfileSection }>(items: T[]): Record<ProfileSection, T[]> {
  const out = Object.fromEntries(PROFILE_SECTIONS.map((s) => [s, [] as T[]])) as Record<ProfileSection, T[]>;
  for (const it of items) out[it.section]?.push(it);
  return out;
}

/**
 * Texto del perfil para las demás funciones (entrevista, inglés…): solo las secciones que la usuaria
 * dejó habilitadas. Así ella controla qué información usa Vivia.
 */
export function profileForAi(items: { section: ProfileSection; title: string; detail: string | null }[], off: string[]): string {
  const grouped = groupBySection(items);
  return PROFILE_SECTIONS
    .filter((s) => !off.includes(s) && grouped[s].length > 0)
    .map((s) => `${SECTION_LABEL[s]}:\n${grouped[s].map((i) => `- ${i.title}${i.detail ? `: ${i.detail}` : ''}`).join('\n')}`)
    .join('\n\n');
}
