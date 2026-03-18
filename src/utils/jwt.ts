export interface JwtParts {
  raw: {
    header: string
    payload: string
    signature: string
  }
  decoded: {
    header: Record<string, unknown>
    payload: Record<string, unknown>
  }
  expStatus: 'valid' | 'expired' | 'no-exp'
  expDate: Date | null
}

function base64UrlDecode(str: string): string {
  const padded = str + '==='.slice((str.length + 3) % 4)
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )
  } catch {
    return atob(base64)
  }
}

export function decodeJwt(token: string): JwtParts {
  const parts = token.trim().split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT: must have 3 parts separated by dots')

  const [rawHeader, rawPayload, rawSignature] = parts as [string, string, string]

  const header = JSON.parse(base64UrlDecode(rawHeader))
  const payload = JSON.parse(base64UrlDecode(rawPayload))

  let expStatus: JwtParts['expStatus'] = 'no-exp'
  let expDate: Date | null = null

  if (typeof payload['exp'] === 'number') {
    expDate = new Date(payload['exp'] * 1000)
    expStatus = expDate > new Date() ? 'valid' : 'expired'
  }

  return {
    raw: { header: rawHeader, payload: rawPayload, signature: rawSignature },
    decoded: { header, payload },
    expStatus,
    expDate,
  }
}
