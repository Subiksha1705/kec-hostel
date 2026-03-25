import prisma from '@/lib/prisma'
import AnnouncementsCarousel from '@/components/announcements/AnnouncementsCarousel'

export default async function AnnouncementsSlot() {
  const announcements = await prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  return <AnnouncementsCarousel announcements={announcements} />
}
