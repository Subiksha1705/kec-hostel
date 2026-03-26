'use client'

import { useCallback, useState } from 'react'

interface UploadResult {
  url: string
  publicId: string
  width: number
  height: number
}

interface UseCloudinaryUpload {
  uploading: boolean
  uploadError: string | null
  upload: (file: File) => Promise<UploadResult | null>
}

export function useCloudinaryUpload(): UseCloudinaryUpload {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setUploading(true)
    setUploadError(null)

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary not configured. Check .env.local')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)
      formData.append('folder', 'kec-hostel/announcements')

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error?.message ?? 'Upload failed')
      }

      const data = await response.json()

      return {
        url: String(data.secure_url).replace('/upload/', '/upload/f_auto,q_auto,w_1200/'),
        publicId: data.public_id,
        width: data.width,
        height: data.height,
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  return { uploading, uploadError, upload }
}
