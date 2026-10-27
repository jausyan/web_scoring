// Small pure-JS SHA-256 (works on http LAN too, where crypto.subtle is unavailable).
export function sha256(str) {
  const rotr = (x, n) => (x >>> n) | (x << (32 - n))
  const primes = []
  for (let n = 2; primes.length < 64; n++) if (primes.every((p) => n % p)) primes.push(n)
  const frac = (x) => ((x - Math.floor(x)) * 4294967296) >>> 0
  const K = primes.map((p) => frac(Math.cbrt(p)))
  const H = primes.slice(0, 8).map((p) => frac(Math.sqrt(p)))

  const b = Array.from(new TextEncoder().encode(str))
  const bitLen = b.length * 8
  b.push(0x80)
  while (b.length % 64 !== 56) b.push(0)
  const hi = Math.floor(bitLen / 4294967296)
  const lo = bitLen >>> 0
  for (const v of [hi, lo]) b.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255)

  const W = new Array(64)
  for (let i = 0; i < b.length; i += 64) {
    for (let t = 0; t < 16; t++)
      W[t] = ((b[i + 4 * t] << 24) | (b[i + 4 * t + 1] << 16) | (b[i + 4 * t + 2] << 8) | b[i + 4 * t + 3]) >>> 0
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3)
      const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10)
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0
    }
    let [a, bb, c, d, e, f, g, h] = H
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + K[t] + W[t]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const mj = (a & bb) ^ (a & c) ^ (bb & c)
      const t2 = (S0 + mj) >>> 0
      h = g; g = f; f = e; e = (d + t1) >>> 0
      d = c; c = bb; bb = a; a = (t1 + t2) >>> 0
    }
    ;[a, bb, c, d, e, f, g, h].forEach((v, k) => (H[k] = (H[k] + v) >>> 0))
  }
  return H.map((x) => x.toString(16).padStart(8, '0')).join('')
}

export const hashPin = (pin) => sha256(`lcc-pin:${String(pin).trim()}`)
