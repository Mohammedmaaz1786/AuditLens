import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to login page by default
  // Users will be redirected to dashboard after successful login
  redirect('/login');
}
