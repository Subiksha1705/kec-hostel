'use client'

import PhoneInputBase from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import Select from '@/components/ui/Select'
import * as Flags from 'country-flag-icons/react/3x2'

type PhoneInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  containerStyle?: React.CSSProperties
}

export default function PhoneInput({
  value,
  onChange,
  placeholder,
  disabled,
  containerStyle,
}: PhoneInputProps) {
  return (
    <div style={containerStyle}>
      <PhoneInputBase
        international
        defaultCountry="IN"
        countryCallingCodeEditable={false}
        value={value || undefined}
        onChange={(next) => onChange(next ?? '')}
        placeholder={placeholder ?? 'Phone number'}
        disabled={disabled}
        className="phone-input"
        countrySelectComponent={({ options, value: country, onChange: onCountryChange, disabled: countryDisabled }) => (
          <Select
            value={country ?? ''}
            onChange={(next) => onCountryChange(next || undefined)}
            disabled={countryDisabled}
            options={options.map((option: { value?: string; label: string }) => ({
              value: option.value ?? '',
              label: (
                <span className="phone-country-option">
                  {(() => {
                    const CodeFlag = (Flags as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>)[
                      option.value ?? ''
                    ]
                    return CodeFlag ? <CodeFlag /> : <span className="phone-flag-fallback" />
                  })()}
                  <span>{option.label}</span>
                </span>
              ),
            }))}
          />
        )}
      />
    </div>
  )
}
