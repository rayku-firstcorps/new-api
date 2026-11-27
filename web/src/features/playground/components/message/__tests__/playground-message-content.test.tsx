/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { beforeAll, describe, expect, test } from 'vitest'

import type { Message } from '../../../types'
import { PlaygroundMessageContent } from '../playground-message-content'

const placeholder = 'Generated images are not kept after a reload'

function renderContent(message: Message) {
  return render(
    <PlaygroundMessageContent
      actions={null}
      alignment='left'
      message={message}
      versionContent={message.versions[0]?.content ?? ''}
    />
  )
}

function imageMessage(
  status: Message['status'],
  base64: string | undefined
): Message {
  return {
    key: 'image-reply',
    from: 'assistant',
    versions: [{ id: 'v1', content: '' }],
    status,
    images: [{ id: 'ig_1', mediaType: 'image/png', base64 }],
  }
}

describe('PlaygroundMessageContent generated images', () => {
  beforeAll(() => {
    i18next.addResourceBundle('en', 'translation', {
      'Generated image': 'Generated image',
      [placeholder]: placeholder,
    })
  })

  test('streaming message with an image shows the image instead of the loader', () => {
    renderContent(imageMessage('streaming', 'iVBORw0KGgo'))

    expect(
      screen.getByRole('img', { name: 'Generated image' }).getAttribute('src')
    ).toBe('data:image/png;base64,iVBORw0KGgo')
    expect(screen.queryByText('Responding...')).toBeNull()
  })

  test('reloaded image without data shows the not-kept placeholder', () => {
    renderContent(imageMessage('complete', undefined))

    expect(screen.getByText(placeholder)).toBeTruthy()
    expect(screen.queryByRole('img', { name: 'Generated image' })).toBeNull()
  })
})
