import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const SCORE_FILE = path.join(DATA_DIR, 'scores.json')

function readJsonFile() {
  try {
    if (fs.existsSync(SCORE_FILE)) {
      return JSON.parse(fs.readFileSync(SCORE_FILE, 'utf-8'))
    }
  } catch (e) {
    console.error('[json-score-store] Failed to read scores.json:', e)
  }
  return null
}

function writeJsonFile(data) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(SCORE_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('[json-score-store] Failed to write scores.json:', e)
  }
}

/**
 * Built-in JSON file persistence middleware for Vite dev & preview server.
 * Saves every score update to `data/scores.json` and streams real-time updates
 * over `/api/scores/stream` (SSE) to any laptop on the same LAN.
 */
function jsonScoreStorePlugin() {
  const clients = new Set()

  const attachMiddleware = (middlewares) => {
    middlewares.use('/api/scores/stream', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })
      const current = readJsonFile()
      if (current) res.write(`data: ${JSON.stringify(current)}\n\n`)
      clients.add(res)
      req.on('close', () => clients.delete(res))
    })

    middlewares.use('/api/scores', (req, res, next) => {
      if (req.url && req.url !== '/' && !req.url.startsWith('?')) return next()

      if (req.method === 'GET') {
        const data = readJsonFile()
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(data))
        return
      }

      if (req.method === 'POST' || req.method === 'PUT') {
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || 'null')
            if (parsed) {
              writeJsonFile(parsed)
              const payload = `data: ${JSON.stringify(parsed)}\n\n`
              clients.forEach((c) => c.write(payload))
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, file: 'data/scores.json' }))
          } catch (e) {
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
        })
        return
      }

      next()
    })
  }

  return {
    name: 'lcc-json-score-store',
    configureServer(server) {
      attachMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares)
    },
  }
}

export default defineConfig({
  plugins: [vue(), jsonScoreStorePlugin()],
  server: { port: 5173, host: true },
})
