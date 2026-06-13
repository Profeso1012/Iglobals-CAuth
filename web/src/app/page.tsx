import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function RootPage() {
  // Check for ICA session cookie — server-side redirect
  const cookieStore = await cookies();
  const session = cookieStore.get('ica_session');
  if (session?.value) {
    redirect('/dashboard');
  }
  redirect('/login');
}
