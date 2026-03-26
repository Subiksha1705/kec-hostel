'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import ImageResize from 'tiptap-extension-resize-image'
import Cropper from 'react-easy-crop'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Scissors,
  Underline as UnderlineIcon,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useCloudinaryUpload } from '@/lib/hooks/useCloudinaryUpload'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function RichEditor({ value, onChange, placeholder }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploading, uploadError, upload } = useCloudinaryUpload()
  const [cropOpen, setCropOpen] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropPixels, setCropPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write announcement details...' }),
      Image,
      ImageResize,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[160px] focus:outline-none px-3 py-2',
      },
    },
  })

  useEffect(() => {
    if (editor && value === '') {
      editor.commands.clearContent()
    }
  }, [value, editor])

  if (!editor) return null

  const selectedImage = editor.isActive('image')
  const imageAttrs = selectedImage ? editor.getAttributes('image') : null

  const btn = (active: boolean) =>
    `p-1.5 rounded text-sm transition-colors ${
      active ? 'bg-[var(--brand)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
    }`

  const canCrop = Boolean(imageAttrs?.src && String(imageAttrs.src).includes('/upload/'))

  const addLink = () => {
    const url = window.prompt('Enter URL')
    if (!url) return
    editor.chain().focus().setLink({ href: url }).run()
  }

  const insertImage = async (file: File) => {
    const result = await upload(file)
    if (!result) return
    editor.chain().focus().setImage({ src: result.url }).run()
    editor.commands.updateAttributes('image', {
      width: result.width,
      height: result.height,
      alt: file.name,
    })
  }

  const openCrop = () => {
    if (!selectedImage || !imageAttrs?.src) return
    if (!canCrop) {
      alert('Cropping is only supported for Cloudinary images.')
      return
    }
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCropPixels(null)
    setCropSrc(imageAttrs.src)
    setCropOpen(true)
  }

  const applyCrop = () => {
    if (!cropSrc || !cropPixels) {
      setCropOpen(false)
      return
    }
    const { x, y, width, height } = cropPixels
    const transform = `c_crop,w_${Math.round(width)},h_${Math.round(height)},x_${Math.round(
      x
    )},y_${Math.round(y)}`
    const [prefix, rest] = cropSrc.split('/upload/')
    if (!rest) {
      setCropOpen(false)
      return
    }
    const nextSrc = `${prefix}/upload/${transform}/${rest}`
    editor.chain().focus().updateAttributes('image', { src: nextSrc }).run()
    setCropOpen(false)
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white overflow-hidden">
      <div className="flex flex-wrap gap-0.5 border-b border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}>
          <Bold size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}>
          <Italic size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))}>
          <UnderlineIcon size={14} />
        </button>

        <div className="w-px h-5 bg-[var(--border)] mx-1 self-center" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btn(editor.isActive('heading', { level: 2 }))}
        >
          <Heading2 size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}>
          <List size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}>
          <ListOrdered size={14} />
        </button>

        <div className="w-px h-5 bg-[var(--border)] mx-1 self-center" />

        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btn(editor.isActive({ textAlign: 'left' }))}>
          <AlignLeft size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btn(editor.isActive({ textAlign: 'center' }))}>
          <AlignCenter size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btn(editor.isActive({ textAlign: 'right' }))}>
          <AlignRight size={14} />
        </button>

        <div className="w-px h-5 bg-[var(--border)] mx-1 self-center" />

        <button type="button" onClick={addLink} className={btn(editor.isActive('link'))}>
          <LinkIcon size={14} />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={btn(false)}
          disabled={uploading}
        >
          <ImageIcon size={14} />
        </button>
        <button type="button" onClick={openCrop} className={btn(false)} disabled={!selectedImage || !canCrop}>
          <Scissors size={14} />
        </button>
        {uploadError ? (
          <span className="text-xs text-red-600 ml-2">{uploadError}</span>
        ) : null}
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) insertImage(file)
          event.target.value = ''
        }}
      />

      {cropOpen && cropSrc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Crop Image</div>
              <button type="button" onClick={() => setCropOpen(false)} className="text-slate-500 hover:text-slate-800">
                <X size={16} />
              </button>
            </div>
            <div className="relative h-80 w-full bg-black/10 rounded-lg overflow-hidden">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
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
                onClick={applyCrop}
                className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm text-white"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
