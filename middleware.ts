export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/dashboard', '/planner', '/settings', '/subjects', '/analytics'],
};
