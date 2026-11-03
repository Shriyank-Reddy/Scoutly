// Skills dictionary: "Canonical|alias|alias". A leading "~" marks a common/low-signal skill (half weight).
const TABLE = `
JavaScript|js|javascript|ecmascript|es6
TypeScript|typescript|ts
Python|python|python3
Java|java
C++|c++|cpp
C#|c#|csharp
C|ansi c|c programming|c language|c/c++
Go|golang|go language|go programming
Rust|rust
Ruby|ruby
Swift|swift
Kotlin|kotlin
PHP|php
Scala|scala
R|r programming|r language|rstudio
MATLAB|matlab
SQL|sql|mysql|postgresql|postgres|sqlite|t-sql
NoSQL|nosql|mongodb|dynamodb|cassandra|redis
Bash|bash|shell scripting|shell
PowerShell|powershell
HTML|html|html5
CSS|css|css3|sass|scss
React|react|react.js|reactjs
Next.js|next.js|nextjs
Vue|vue|vue.js
Angular|angular
Node.js|node|node.js|nodejs
Express|express|express.js
Django|django
Flask|flask
FastAPI|fastapi
Spring|spring|spring boot
.NET|.net|dotnet|asp.net
Tailwind CSS|tailwind|tailwindcss
GraphQL|graphql
REST APIs|rest|restful|rest api|rest apis
Machine Learning|machine learning|ml
Deep Learning|deep learning|neural networks
NLP|nlp|natural language processing
Computer Vision|computer vision
LLMs|llm|llms|large language models|generative ai|genai
Reinforcement Learning|reinforcement learning
PyTorch|pytorch
TensorFlow|tensorflow|keras
scikit-learn|scikit-learn|sklearn
Pandas|pandas
NumPy|numpy
Data Analysis|data analysis|data analytics|analytics
Data Science|data science
Data Engineering|data engineering|etl|data pipelines
Spark|spark|pyspark
Hadoop|hadoop
Kafka|kafka
Airflow|airflow
Tableau|tableau
Power BI|power bi|powerbi
Statistics|statistics|statistical
AWS|aws|amazon web services|ec2|s3|lambda
Azure|azure
GCP|gcp|google cloud
Docker|docker|containers
Kubernetes|kubernetes|k8s
Terraform|terraform|infrastructure as code
CI/CD|ci/cd|cicd|continuous integration|github actions|jenkins
Linux|linux|unix
Networking|networking|tcp/ip|dns
Cybersecurity|cybersecurity|cyber security|infosec|information security
Penetration Testing|penetration testing|pentesting|pen testing|red team
Cryptography|cryptography|encryption
Security Engineering|appsec|application security|threat modeling|vulnerability
SIEM|siem|splunk|soc analyst
Reverse Engineering|reverse engineering|malware analysis
Embedded Systems|embedded|firmware|rtos|microcontrollers
Robotics|robotics|ros
Operating Systems|operating systems|kernel
Distributed Systems|distributed systems|microservices
Databases|databases|database design
Algorithms|algorithms|data structures|dsa
Systems Programming|systems programming|low-level
Mobile Development|mobile development|ios|android|react native|flutter
Game Development|game development|unity|unreal
Blockchain|blockchain|web3|solidity|smart contracts
Quantitative Finance|quantitative|quant|trading|algorithmic trading
Finance|finance|financial modeling|fintech
~Git|git|github|version control
~Excel|excel|spreadsheets
~Agile|agile|scrum
~Jira|jira
~Testing|unit testing|testing|jest|pytest|qa
~Figma|figma
UI/UX Design|ux|ui/ux|user experience|ui design|product design
Product Management|product management|product manager|roadmap
Marketing|marketing|seo|content marketing|growth
Research|research|academic research|publications
Technical Writing|technical writing|documentation
~Communication|communication|presentation skills
~Teamwork|teamwork|collaboration|cross-functional
~Problem Solving|problem solving|problem-solving
Open Source|open source|open-source
Hardware|hardware|verilog|vhdl|fpga|circuit design
Computer Architecture|computer architecture|gpu|cuda|hpc
Bioinformatics|bioinformatics|computational biology
`;

export interface Skill { name: string; weight: number; re: RegExp }
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

export const SKILLS: Skill[] = TABLE.trim().split('\n').map((line) => {
  const low = line.startsWith('~');
  const [name, ...aliases] = line.replace(/^~/, '').split('|');
  const alt = [...new Set([name.toLowerCase(), ...aliases.map((a) => a.toLowerCase())])].map(esc).sort((a, b) => b.length - a.length);
  // Boundaries that understand c++, c#, node.js, .net (plain \b does not).
  const pre = alt.every((a) => a.startsWith('\\.')) ? '(?<![a-z0-9])' : '(?<![a-z0-9.])';
  return { name, weight: low ? 0.5 : 1, re: new RegExp(`${pre}(?:${alt.join('|')})(?![a-z0-9+#])`, 'i') };
});

export const SKILL_WEIGHT = new Map(SKILLS.map((s) => [s.name, s.weight]));

// Single letters are far too ambiguous; match them case-sensitively with a language cue only.
const AMBIGUOUS = new Set(['C', 'R', 'Go']);

/** Find canonical skills mentioned in free text. */
export function extractSkills(text: string): string[] {
  const found: string[] = [];
  for (const s of SKILLS) {
    if (AMBIGUOUS.has(s.name)) {
      const strict = s.name === 'C' ? /\bC(?:\/C\+\+|\s+(?:programming|language))|\bANSI C\b/ : s.name === 'R' ? /\bR\s+(?:programming|language)\b|\bRStudio\b/ : /\bGolang\b|\bGo\s+(?:programming|language)\b|\b(?:in|with|using) Go\b/;
      if (strict.test(text)) found.push(s.name);
    } else if (s.re.test(text)) found.push(s.name);
  }
  return found;
}

export const ALL_SKILL_NAMES = SKILLS.map((s) => s.name);
export function canonicalSkill(input: string): string | null {
  const hit = SKILLS.find((s) => s.name.toLowerCase() === input.trim().toLowerCase());
  if (hit) return hit.name;
  const ex = extractSkills(input);
  return ex[0] ?? null;
}
