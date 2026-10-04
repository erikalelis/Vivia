import { ai } from '@/services/ai';
import { profileForAi } from '@/domain/profile';
import { validateAnswer, validateListen, validatePrep, type InterviewAnswer, type InterviewPrep, type ListenResult } from '@/domain/interview';
import { encodeWav } from '@/domain/live';
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

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Manda una frase escuchada en vivo y devuelve qué se dijo y, si era una pregunta, la respuesta. */
export async function listenSegment(pcm: Float32Array, profile: string, vacancy: string, context: string): Promise<ListenResult | null> {
  const wav = encodeWav(pcm);
  return validateListen(await ai.interview({ action: 'listen', audio_base64: bytesToBase64(wav), profile, vacancy: vacancy.trim(), context }));
}
