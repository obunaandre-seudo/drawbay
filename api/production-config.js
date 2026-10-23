const REQUIRED_PRODUCTION_VARIABLES = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'APP_URL',
  'RESEND_API_KEY',
  'EMAIL_FROM'
];

export function getProductionConfigProblems(env) {
  if (env.NODE_ENV !== 'production') return [];

  const problems = REQUIRED_PRODUCTION_VARIABLES.filter(key => !env[key]);
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32 && !problems.includes('JWT_SECRET')) {
    problems.push('JWT_SECRET (must be at least 32 characters)');
  }
  if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length < 16 && !problems.includes('ADMIN_PASSWORD')) {
    problems.push('ADMIN_PASSWORD (must be at least 16 characters)');
  }
  if (env.APP_URL && !env.APP_URL.startsWith('https://') && !problems.includes('APP_URL')) {
    problems.push('APP_URL (must use HTTPS)');
  }
  return problems;
}
