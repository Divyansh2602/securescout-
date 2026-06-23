import { redirect } from 'next/navigation';

// No content lives at "/"; send visitors to the sign-in entry point.
export default function Home() {
  redirect('/auth/login');
}
