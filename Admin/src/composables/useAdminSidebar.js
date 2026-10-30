import { computed, unref } from 'vue'
import { adminNavigation, canOpenModule, navigationSections } from '@/data/permissions'
import bookIcon from '@/assets/icons/book-open-text.svg'
import readerIcon from '@/assets/icons/user.svg'
import borrowIcon from '@/assets/icons/book-lock.svg'
import publisherIcon from '@/assets/icons/publisher.svg'
import dashboardIcon from '@/assets/icons/panels-top-left.svg'
import employeeIcon from '@/assets/icons/id-card-lanyard.svg'
import profileIcon from '@/assets/icons/file-user.svg'

export default function useAdminSidebar(user) {
  const visibleSections = computed(() => navigationSections.map((section) => ({
    ...section,
    items: adminNavigation.filter((item) => item.section === section.key && canOpenModule(unref(user)?.chucVu, item.key)),
  })).filter((section) => section.items.length))

  const iconByName = {
    'panels-top-left': dashboardIcon,
    'book-open-text': bookIcon,
    user: readerIcon,
    'book-lock': borrowIcon,
    publisher: publisherIcon,
    'id-card-lanyard': employeeIcon,
    'file-user': profileIcon,
  }

  return { visibleSections, iconByName }
}
