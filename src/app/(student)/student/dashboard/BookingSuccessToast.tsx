'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function BookingSuccessToast() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('booking') === 'success') {
      toast.success('Booking confirmed! Your seat is reserved.', { duration: 5000 })
      // Remove the query param without a full page reload
      const url = new URL(window.location.href)
      url.searchParams.delete('booking')
      url.searchParams.delete('library')
      router.replace(url.pathname, { scroll: false })
    }
  }, [searchParams, router])

  return null
}
