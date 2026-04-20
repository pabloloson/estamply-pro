const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'estamply-storage'
const API_KEY = process.env.BUNNY_STORAGE_API_KEY || ''
const CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME || 'estamply-cdn.b-cdn.net'
const STORAGE_BASE = `https://storage.bunnycdn.com/${STORAGE_ZONE}`

export async function upload(buffer: Buffer, path: string): Promise<string> {
  const res = await fetch(`${STORAGE_BASE}/${path}`, {
    method: 'PUT',
    headers: {
      'AccessKey': API_KEY,
      'Content-Type': 'application/octet-stream',
    },
    body: new Uint8Array(buffer),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Bunny upload failed (${res.status}): ${text}`)
  }
  return `https://${CDN_HOSTNAME}/${path}`
}

export async function deleteFile(path: string): Promise<void> {
  await fetch(`${STORAGE_BASE}/${path}`, {
    method: 'DELETE',
    headers: { 'AccessKey': API_KEY },
  })
}
