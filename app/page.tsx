import { redirect } from 'next/navigation'

export default function Home() {
  // This will be handled by middleware, but adding as fallback
  redirect('/dashboard')
}
