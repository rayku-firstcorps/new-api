import { createFileRoute } from '@tanstack/react-router'
import { ImageGeneration } from '@/features/image-generation'

export const Route = createFileRoute('/image-generation/')({
  component: ImageGeneration,
})
