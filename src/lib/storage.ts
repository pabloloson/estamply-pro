import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

export async function uploadFile(bucket: string, filePath: string, file: Buffer) {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', bucket)
  await mkdir(uploadDir, { recursive: true })
  const fullPath = path.join(uploadDir, filePath)
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, file)
  return `/uploads/${bucket}/${filePath}`
}

export function getPublicUrl(bucket: string, filePath: string) {
  return `/uploads/${bucket}/${filePath}`
}

export async function deleteFile(bucket: string, filePath: string) {
  const fullPath = path.join(process.cwd(), 'public', 'uploads', bucket, filePath)
  try { await unlink(fullPath) } catch { /* file might not exist */ }
}
