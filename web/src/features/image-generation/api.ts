import { api } from '@/lib/api'

import type {
  ImageGenerationListResponse,
  ImageGenerationTagsResponse,
  ImageGenerationTemplateDetail,
  GeneratedImage,
} from './types'

export async function getImageGenerationTags(): Promise<ImageGenerationTagsResponse> {
  const res = await api.get('/api/image-generation/tags')
  return res.data.data
}

export async function getImageGenerationTemplates(params: {
  keyword?: string
  tag?: string
  page?: number
  page_size?: number
}): Promise<ImageGenerationListResponse> {
  const res = await api.get('/api/image-generation/templates', { params })
  return res.data.data
}

export async function getImageGenerationTemplate(
  id: number
): Promise<ImageGenerationTemplateDetail> {
  const res = await api.get(`/api/image-generation/templates/${id}`)
  return res.data.data
}

export async function generateImage(payload: {
  template_id?: number
  model: string
  prompt: string
  size: string
  n: number
}): Promise<{ images: GeneratedImage[]; request_id: string }> {
  const res = await api.post('/api/image-generation/generate', payload)
  return res.data.data
}
