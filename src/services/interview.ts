import { ai } from '@/services/ai';
import { profileForAi } from '@/domain/profile';
import { validateAnswer, validatePrep, type InterviewAnswer, type InterviewPrep } from '@/domain/interview';
import { getOffSections, listProfile, ProfileError, readDocument } from '@/services/profile';

/** Perfil en texto, solo con las secciones que la usuaria dejó habilitadas. */
export async function loadProfileText(): Promise<string> {
  const [items, off] = await Promise.all([listProfile(), getOffSections()]);
  return profileForAi(items, off);
}

export async function prepareInterview(vacancyText: string, file: File | null): Promise<InterviewPrep> {
  const profile = await loadProfileText();
  if (!profile) throw new ProfileError('Primero cargá tu CV en Mi perfil, así puedo armar respuestas con tu experiencia real.');
  const doc: { text?: string; pdfBase64?: string } = file ? await readDocument(file) : {};
  const vacancy = [vacancyText.trim(), doc.text ?? ''].filter(Boolean).join('\n\n');
  if (!vacancy && !doc.pdfBase64) throw new ProfileError('Pegá el texto de la vacante o subí el archivo.');
  const prep = validatePrep(await ai.interview({ action: 'prep', profile, vacancy, vacancy_pdf_base64: doc.pdfBase64 }));
  if (!prep) throw new ProfileError('No pude armar la preparación con esa vacante. Probá con más texto.');
  return prep;
}

export async function answerQuestion(question: string, vacancy: string, blank: boolean): Promise<InterviewAnswer> {
  const profile = await loadProfileText();
  if (!profile) throw new ProfileError('Primero cargá tu CV en Mi perfil, así puedo armar respuestas con tu experiencia real.');
  const a = validateAnswer(await ai.interview({ action: 'answer', profile, vacancy: vacancy.trim(), question, blank }));
  if (!a) throw new ProfileError('No pude armar una respuesta. Probá de nuevo.');
  return a;
}
