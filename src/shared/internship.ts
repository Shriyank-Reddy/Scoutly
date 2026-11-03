const INCLUDE = /\b(interns?|internships?|co-?ops?|students?|working student|werkstudent|apprentices?|apprenticeships?|placement|trainee)\b/i;
const EXCLUDE = /\b(senior|sr\.?|staff|principal|manager|director|head of|lead|vp|vice president|president|chief|architect)\b/i;
// "Student" alone is ambiguous (e.g. "Student Loan Specialist"), so require extra signals for it.
const WEAK_ONLY = /\bstudents?\b/i;

/** Decide whether a title (plus the opening of the description) looks like an internship-type role. */
export function isInternship(title: string, text = ''): boolean {
  if (EXCLUDE.test(title)) return false;
  const m = title.match(INCLUDE);
  if (!m) return false;
  if (WEAK_ONLY.test(m[0]) && !/working student|student (intern|engineer|developer|researcher|program|assistant|worker)|university|campus/i.test(title + ' ' + text.slice(0, 400))) return false;
  return true;
}
