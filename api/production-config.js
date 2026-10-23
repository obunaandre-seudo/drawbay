const REQUIRED_PRODUCTION_VARIABLES = [
  'DATABASE_URL',
  'JWT_SECRET'
];

export function getProductionConfigProblems(env) {
  if (env.NODE_ENV !== 'production') return [];

  const problems = REQUIRED_PRODUCTION_VARIABLES.filter(key => !env[key]);
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32 && !problems.includes('JWT_SECRET')) {
    problems.push('JWT_SECRET (must be at least 32 characters)');
  }
  return problems;
}
