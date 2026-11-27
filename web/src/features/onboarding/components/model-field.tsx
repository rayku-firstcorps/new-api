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
import { useTranslation } from 'react-i18next'

import { Combobox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'

interface ModelFieldProps {
  models: readonly string[]
  value: string
  onChange: (model: string) => void
}

/** Model picker shared by the API and playground branches of Step 3. */
export function ModelField(props: ModelFieldProps) {
  const { t } = useTranslation()

  return (
    <div className='space-y-1.5'>
      <Label htmlFor='onboarding-model'>{t('Model')}</Label>
      <Combobox
        id='onboarding-model'
        aria-label={t('Model')}
        options={props.models.map((name) => ({ value: name, label: name }))}
        value={props.value}
        onValueChange={(next) => props.onChange(next ?? '')}
        placeholder={t('Select or enter model name')}
        emptyText={t('No models found')}
      />
    </div>
  )
}
