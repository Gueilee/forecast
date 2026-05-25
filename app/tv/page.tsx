import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getTvData } from '@/lib/tv-data'
import { TvDashboard } from '@/components/tv/TvDashboard'

export default async function TvPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const data = await getTvData()
  return <TvDashboard initialData={data} />
}
