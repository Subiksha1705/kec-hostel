'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Cropper from 'react-easy-crop'
import { Loader2, ImageIcon, X } from 'lucide-react'
import { useCloudinaryUpload } from '@/lib/hooks/useCloudinaryUpload'

interface Props {
  value: string | null
  publicId: string | null
  onChange: (url: string | null, publicId: string | null) => void
}

export default function CloudinaryImageUpload({ value, publicId, onChange }: Props) {
  const { uploading, uploadError, upload } = useCloudinaryUpload()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropPixels, setCropPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [scale, setScale] = useState(1)
  const [pendingName, setPendingName] = useState('poster')

  const openCropper = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      setPendingName(file.name || 'poster')
      setCropSrc(String(reader.result))
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setScale(1)
      setCropPixels(null)
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const getCroppedBlob = async (
    imageSrc: string,
    pixels: { x: number; y: number; width: number; height: number },
    nextScale: number
  ) => {
    const image = new window.Image()
    image.src = imageSrc
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
    })

    const outputWidth = Math.max(1, Math.round(pixels.width * nextScale))
    const outputHeight = Math.max(1, Math.round(pixels.height * nextScale))
    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outputHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(
      image,
      pixels.x,
      pixels.y,
      pixels.width,
      pixels.height,
      0,
      0,
      outputWidth,
      outputHeight
    )

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
    })
  }

  const handleFile = async (file: File) => {
    await openCropper(file)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)]">
          <div className="relative h-40 w-full">
            <Image src={value} alt="Announcement image" fill className="object-cover" unoptimized />
          </div>
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
          >
            <X size={14} />
          </button>
          <p className="px-3 py-1.5 text-xs text-[var(--text-muted)] truncate">
            {publicId ? `${publicId} · ` : ''}
            {value}
          </p>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors h-32 ${
            dragOver
              ? 'border-[var(--brand)] bg-blue-50'
              : 'border-[var(--border)] hover:border-[var(--brand)] bg-[var(--surface-2)]'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin text-[var(--brand)]" />
              <p className="text-xs text-[var(--text-secondary)]">Uploading to Cloudinary...</p>
            </>
          ) : (
            <>
              <ImageIcon size={20} className="text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-secondary)]">
                Drop image or <span className="text-[var(--brand)] font-semibold">browse</span>
              </p>
              <p className="text-xs text-[var(--text-muted)]">JPG, PNG, WebP · Max 10MB</p>
            </>
          )}
        </div>
      )}

      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
          event.target.value = ''
        }}
      />

      {cropOpen && cropSrc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Crop Poster Image</div>
              <button type="button" onClick={() => setCropOpen(false)} className="text-slate-500 hover:text-slate-800">
                <X size={16} />
              </button>
            </div>
            <div className="relative h-80 w-full bg-black/10 rounded-lg overflow-hidden">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCropPixels(pixels)}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-[var(--text-secondary)]">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-[var(--text-secondary)]">Scale</label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCropOpen(false)}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={async () => {
                  if (!cropPixels || !cropSrc) {
                    setCropOpen(false)
                    return
                  }
                  const blob = await getCroppedBlob(cropSrc, cropPixels, scale)
                  if (!blob) {
                    setCropOpen(false)
                    return
                  }
                  const file = new File([blob], pendingName || 'poster.jpg', { type: blob.type || 'image/jpeg' })
                  const result = await upload(file)
                  if (result) onChange(result.url, result.publicId)
                  setCropOpen(false)
                }}
                className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {uploading ? 'Uploading...' : 'Apply Crop'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
