// -------------------------------- Skills Dictionary ---------------------------
// Used by the parsing engine to identify known skills within CV text.

export const SKILLS_DICTIONARY: string[] = [
  // Programming Languages
  'TypeScript',
  'JavaScript',
  'Python',
  'Java',
  'C#',
  'C++',
  'C',
  'Go',
  'Rust',
  'Ruby',
  'PHP',
  'Swift',
  'Kotlin',
  'Scala',
  'R',

  // Frontend
  'React',
  'Angular',
  'Vue',
  'Vue.js',
  'Next.js',
  'Svelte',
  'HTML',
  'HTML5',
  'CSS',
  'CSS3',
  'Sass',
  'Tailwind',
  'Tailwind CSS',
  'Bootstrap',
  'jQuery',
  'Redux',
  'Webpack',
  'Vite',

  // Backend
  'Node.js',
  'NestJS',
  'Express',
  'Express.js',
  'Spring',
  'Spring Boot',
  '.NET',
  'ASP.NET',
  'Django',
  'Flask',
  'FastAPI',
  'Laravel',
  'Ruby on Rails',
  'GraphQL',
  'REST',
  'REST API',
  'gRPC',
  'Microservices',

  // Mobile
  'React Native',
  'Flutter',
  'iOS',
  'Android',
  'Xamarin',

  // Cloud & DevOps
  'AWS',
  'Amazon Web Services',
  'Azure',
  'GCP',
  'Google Cloud Platform',
  'Docker',
  'Kubernetes',
  'Terraform',
  'Ansible',
  'Jenkins',
  'CI/CD',
  'GitHub Actions',
  'GitLab CI',
  'CircleCI',
  'DevOps',
  'Site Reliability Engineering',
  'SRE',

  // Databases
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'Oracle',
  'SQL Server',
  'SQLite',
  'DynamoDB',
  'Cassandra',
  'Elasticsearch',
  'SQL',
  'NoSQL',

  // Version Control
  'Git',
  'GitHub',
  'GitLab',
  'Bitbucket',
  'SVN',

  // Methodologies
  'Agile',
  'Scrum',
  'Kanban',
  'Waterfall',
  'TDD',
  'BDD',
  'Pair Programming',
  'Lean',

  // Testing
  'Jest',
  'Mocha',
  'Cypress',
  'Selenium',
  'JUnit',
  'PyTest',
  'Unit Testing',
  'Integration Testing',
  'End-to-End Testing',

  // Data & AI
  'Machine Learning',
  'Deep Learning',
  'TensorFlow',
  'PyTorch',
  'Pandas',
  'NumPy',
  'Data Analysis',
  'Data Science',
  'Power BI',
  'Tableau',
  'ETL',
  'Apache Spark',
  'Hadoop',

  // Project Management Tools
  'Jira',
  'Confluence',
  'Trello',
  'Asana',
  'Monday.com',

  // Design
  'Figma',
  'Adobe XD',
  'Sketch',
  'UI/UX Design',
  'Photoshop',

  // Security
  'Cybersecurity',
  'Penetration Testing',
  'OWASP',
  'Network Security',

  // Soft Skills
  'Leadership',
  'Communication',
  'Problem Solving',
  'Team Management',
  'Stakeholder Management',
  'Project Management',
  'Time Management',
  'Critical Thinking',
  'Mentoring',
  'Public Speaking',

  // Business / Domain
  'Business Analysis',
  'Requirements Gathering',
  'Process Improvement',
  'Financial Modelling',
  'Risk Management',
  'Compliance',
];

export const SKILLS_DICTIONARY_LOWERCASE: Set<string> = new Set(
  SKILLS_DICTIONARY.map((skill) => skill.toLowerCase()),
);

export const SKILLS_CANONICAL_MAP: Map<string, string> = new Map(
  SKILLS_DICTIONARY.map((skill) => [skill.toLowerCase(), skill]),
);
