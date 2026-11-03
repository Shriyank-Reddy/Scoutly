import type { Profile } from '../shared/types';
import { extractSkills } from '../shared/skills';

export type ParsedResume = Pick<Profile, 'name' | 'skills' | 'education' | 'links' | 'resumeText'>;

const DEGREE = /\b(b\.?s\.?c?\.?|b\.?a\.?|b\.?e\.?|b\.?tech|bachelor(?:'s)?(?: of [a-z ]+)?|m\.?s\.?c?\.?|m\.?a\.?|m\.?tech|master(?:'s)?(?: of [a-z ]+)?|ph\.?d\.?|doctorate|associate)\b/i;
const SCHOOL = /\b(university|college|institute|school of|polytechnic|academy|iit|nit)\b/i;

/** Pure function: resume plain text -> editable profile fields. No network, no AI. */
export function parseResumeText(text: string): ParsedResume {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const name = lines.find((l) => /^[A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){1,3}$/.test(l) && !SCHOOL.test(l) && l.length < 40) ?? '';
  const links = [...new Set((text.match(/(?:https?:\/\/|www\.)[^\s)>\]|,]+|(?:github|linkedin)\.com\/[^\s)>\]|,]+/gi) ?? []).map((u) => u.replace(/[.;]+$/, '')))];

  const education: ParsedResume['education'] = [];
  lines.forEach((line, i) => {
    if (!SCHOOL.test(line) || line.length > 120) return;
    const ctx = [lines[i - 1] ?? '', line, lines[i + 1] ?? '', lines[i + 2] ?? ''].join(' ');
    const years = [...ctx.matchAll(/\b(20[0-4]\d)\b/g)].map((m) => +m[1]);
    const expected = ctx.match(/(?:expected|anticipated|graduat\w*|class of|to)\s*:?\s*(?:[A-Za-z]+\.?\s*)?(20[0-4]\d)/i);
    const gradYear = expected ? +expected[1] : years.length ? Math.max(...years) : null;
    const degree = (ctx.match(DEGREE)?.[0] ?? '') && (ctx.match(/(?:bachelor|master|b\.?s\.?|m\.?s\.?|ph\.?d)[^,\n]{0,40}/i)?.[0].trim() ?? '');
    education.push({ school: line.replace(/\s*[|,–-]\s*(?:expected|anticipated).*$/i, '').slice(0, 80), degree, gradYear });
  });

  return { name, skills: extractSkills(text), education: education.slice(0, 3), links: links.slice(0, 6), resumeText: text.slice(0, 20000) };
}

/** Read a PDF, DOCX or text file in the browser. Libraries are loaded on demand to keep the first page fast. */
export async function readResumeFile(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'pdf' || file.type === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist');
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      let line = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        line += item.str + (item.hasEOL ? '\n' : ' ');
      }
      pages.push(line);
    }
    return pages.join('\n');
  }
  if (ext === 'docx') {
    const mammoth = await import('mammoth/mammoth.browser');
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }
  return file.text();
}
