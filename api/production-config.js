const REQUIRED_PRODUCTION_VARIABLES = [
  'JWT_SECRET'
];

export function getDatabaseUrl(env) {
  return env.DATABASE_URL || env.POSTGRES_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL_NON_POOLING || '';
}

export function getProductionConfigProblems(env) {
  if (env.NODE_ENV !== 'production') return [];

  const problems = REQUIRED_PRODUCTION_VARIABLES.filter(key => !env[key]);
  if (!getDatabaseUrl(env)) problems.unshift('DATABASE_URL (or POSTGRES_URL)');
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32 && !problems.includes('JWT_SECRET')) {
    problems.push('JWT_SECRET (must be at least 32 characters)');
  }
  return problems;
}
