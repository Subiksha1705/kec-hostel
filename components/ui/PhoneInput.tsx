'use client'

import PhoneInputBase from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

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
      />
    </div>
  )
}
