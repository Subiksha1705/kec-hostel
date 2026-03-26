import prisma from '@/lib/prisma'
import AnnouncementsCarousel from '@/components/announcements/AnnouncementsCarousel'

export const dynamic = 'force-dynamic'

export default async function AnnouncementsSlot() {
  const announcements = await prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  })

  return <AnnouncementsCarousel announcements={announcements} />
}
