import { useState } from "react"
import { AsYouType, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js"
import { cn } from "@/lib/utils"
import { SelectField, inputCls } from "./form-kit"

/** Countries we accept phone numbers from, first is the default (matches the server). */
export const PHONE_COUNTRIES: { code: CountryCode; name: string; flag: string; dial: string }[] = [
    { code: "AU", name: "Australia", flag: "🇦🇺", dial: "+61" },
    { code: "NZ", name: "New Zealand", flag: "🇳🇿", dial: "+64" },
    { code: "US", name: "United States", flag: "🇺🇸", dial: "+1" },
    { code: "NP", name: "Nepal", flag: "🇳🇵", dial: "+977" },
]
const SUPPORTED = PHONE_COUNTRIES.map((c) => c.code)
const nameOf = (code: CountryCode) => PHONE_COUNTRIES.find((c) => c.code === code)?.name ?? code

/** A value's country and number: "AU|0412…" from the input, E.164, or an old number with no code (read as Australian). */
const read = (value: string): { country?: CountryCode; national: string } => {
    const raw = value.trim()
    if (raw.includes("|")) {
        const [country, national] = raw.split("|") as [CountryCode, string]
        return { country, national }
    }
    return raw.startsWith("+") ? { national: raw } : { country: "AU", national: raw }
}

/** Validation message for a stored/emitted value, or null when it's a valid supported number. */
export function phoneError(value: string): string | null {
    if (!value.trim()) return null
    const { country, national } = read(value)
    const parsed = parsePhoneNumberFromString(national, country)
    if (parsed?.isValid() && parsed.country && SUPPORTED.includes(parsed.country)) return null
    if (parsed?.country && !SUPPORTED.includes(parsed.country)) return "Use a number from Australia, New Zealand, the United States or Nepal"
    if (country) return `Not a valid ${nameOf(country)} number`
    return "Use a number from Australia, New Zealand, the United States or Nepal"
}

/** E.164 for saving (e.g. "+61412345678"); the value unchanged if it isn't a valid number. */
export function toE164(value: string): string {
    const { country, national } = read(value)
    const parsed = parsePhoneNumberFromString(national, country)
    return parsed?.isValid() ? parsed.number : value
}

/** "+61 412 345 678" for display (older numbers are read as Australian); anything unparseable is shown as stored. */
export function formatPhone(value?: string | null): string {
    if (!value) return ""
    return parsePhoneNumberFromString(toE164(value))?.formatInternational() ?? value
}

/** Country and national digits for an existing value (E.164 or an old free-text number). */
function split(value: string): { country: CountryCode; national: string } {
    const parsed = value.startsWith("+") ? parsePhoneNumberFromString(value) : undefined
    if (parsed?.country && SUPPORTED.includes(parsed.country)) {
        return { country: parsed.country, national: parsed.formatNational() }
    }
    const { country, national } = read(value)
    return { country: country ?? "AU", national }
}

/**
 * Country-code picker plus number. Emits E.164 (e.g. "+61412345678") once the number is
 * valid for the chosen country; until then it emits "AU|0412" so `phoneError` can say what's wrong.
 */
export function PhoneInput({ value, onChange, onBlur, label, className }: {
    value: string
    onChange: (value: string) => void
    onBlur?: () => void
    label: string
    className?: string
}) {
    const initial = split(value)
    const [country, setCountry] = useState<CountryCode>(initial.country)
    const [national, setNational] = useState(initial.national)

    const emit = (c: CountryCode, n: string) => {
        if (!n.trim()) return onChange("")
        const parsed = parsePhoneNumberFromString(n, c)
        onChange(parsed?.isValid() && parsed.country === c ? parsed.number : `${c}|${n}`)
    }

    return (
        <div className={cn("flex gap-1.5", className)}>
            <SelectField
                label="Country code"
                value={country}
                onChange={(c) => { setCountry(c); emit(c, national) }}
                onBlur={onBlur}
                options={PHONE_COUNTRIES.map((c) => [c.code, `${c.flag} ${c.dial}`] as const)}
                className="w-[112px] flex-none"
                selectClassName="num pl-2.5"
            />
            <input
                aria-label={label}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                className={cn(inputCls, "num min-w-0 flex-1")}
                value={national}
                onChange={(e) => {
                    // Format as they type for the chosen country, e.g. "0412 345 678"
                    const typed = e.target.value
                    const next = typed.length < national.length ? typed : new AsYouType(country).input(typed)
                    setNational(next)
                    emit(country, next)
                }}
                onBlur={onBlur}
                placeholder={country === "AU" ? "0412 345 678" : country === "NZ" ? "021 123 4567" : country === "US" ? "(201) 555-0123" : "980-1234567"}
            />
        </div>
    )
}
