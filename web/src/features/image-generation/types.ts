export interface ImageGenerationTag {
  name: string
  count: number
}

export interface ImageGenerationTemplateListItem {
  id: number
  title: string
  description: string
  prompt_excerpt: string
  image_url: string
  image_urls: string[]
  tags: string[]
  created_at: number
  updated_at: number
}

export interface ImageGenerationTemplateDetail {
  id: number
  title: string
  description: string
  prompt: string
  image_url: string
  image_urls: string[]
  tags: string[]
  created_at: number
  updated_at: number
}

export interface ImageGenerationListResponse {
  items: ImageGenerationTemplateListItem[]
  page: number
  page_size: number
  total: number
}

export interface ImageGenerationTagsResponse {
  tags: ImageGenerationTag[]
}

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error'

export interface GeneratedImage {
  url: string
  revised_prompt?: string
}

export interface GenerationOptions {
  prompt: string
  model: string
  size: '1024x1024' | '1024x1536' | '1536x1024'
  n: number
}
