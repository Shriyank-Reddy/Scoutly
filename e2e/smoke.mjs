// Smoke test of the main flow. Needs the site served: `npm run build && npm run preview -- --port 4173`
// then `npm run e2e`. Uses the Playwright that is installed in the environment (not a project dependency).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // CommonJS require so NODE_PATH works
import assert from 'node:assert/strict';

const URL = process.env.SCOUTLY_URL ?? 'http://localhost:4173/';
const RESUME = `Alex Student
Tempe, AZ | github.com/alexstudent
EDUCATION
Arizona State University
B.S. Computer Science, Expected May 2027
SKILLS: Python, PyTorch, Machine Learning, React, SQL, Git`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(URL);
await page.getByText('Sample data.').waitFor(); // honest labelling while data is sample
await page.getByText('Upload your resume to see match scores').waitFor();

await page.getByRole('link', { name: 'Profile', exact: true }).click();
await page.getByLabel('Paste resume text').fill(RESUME);
await page.getByRole('button', { name: 'Extract from pasted text' }).click();
await page.getByText(/Found \d+ skills/).waitFor();
await page.getByLabel('Available from').fill('2027-05-10');
await page.getByLabel('Available until').fill('2027-08-15');

await page.getByRole('link', { name: 'Search', exact: true }).click();
await page
  .getByRole('img', { name: /Match score \d+ percent/ })
  .first()
  .waitFor();
await page
  .getByRole('button', { name: /Machine Learning Intern/ })
  .first()
  .click();
await page.getByRole('heading', { name: 'Why it matched' }).waitFor();
await page.getByRole('button', { name: 'Save to tracker' }).click();
await page.getByText('✓ In tracker').waitFor();
await page.keyboard.press('Escape');

await page.getByRole('link', { name: /Tracker/ }).click();
await page.getByRole('heading', { name: /Tracker/ }).waitFor();
assert.equal(
  await page.getByRole('region', { name: 'Saved column' }).getByRole('listitem').count(),
  1,
);

await page.getByRole('link', { name: 'Profile', exact: true }).click();
await page.getByRole('button', { name: 'Delete all my data' }).click();
await page.getByRole('button', { name: 'Yes, delete' }).click();
await page.getByRole('link', { name: 'Tracker' }).click();
await page.getByText('Nothing saved yet').waitFor();
console.log('smoke test passed');
await browser.close();
