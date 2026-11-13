import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
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

function getLocalIps() {
  const nets = os.networkInterfaces()
  const ips = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address)
      }
    }
  }
  return ips
}

/**
 * Built-in JSON file persistence & LAN synchronization middleware for Vite dev & preview server.
 * Saves every score update to `data/scores.json` and streams real-time updates
 * over `/api/scores/stream` (SSE) to any laptop on the same local network.
 */
function jsonScoreStorePlugin() {
  const clients = new Set()

  const attachMiddleware = (middlewares) => {
    // SSE Stream
    middlewares.use('/api/scores/stream', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      })
      if (typeof res.flushHeaders === 'function') res.flushHeaders()

      const current = readJsonFile()
      if (current) {
        res.write(`data: ${JSON.stringify(current)}\n\n`)
      }

      clients.add(res)

      // Keep-alive heartbeat every 15s to prevent network timeouts
      const keepAlive = setInterval(() => {
        try {
          res.write(':\n\n')
        } catch {
          clearInterval(keepAlive)
          clients.delete(res)
        }
      }, 15000)

      req.on('close', () => {
        clearInterval(keepAlive)
        clients.delete(res)
      })
    })

    // Local Network IP info for easy multi-device connection
    middlewares.use('/api/info', (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.end(JSON.stringify({ ips: getLocalIps(), port: 5173 }))
    })

    // REST score read / write
    middlewares.use('/api/scores', (req, res, next) => {
      if (req.url && req.url !== '/' && !req.url.startsWith('?')) return next()

      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.statusCode = 204
        res.end()
        return
      }

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
              for (const c of clients) {
                try {
                  c.write(payload)
                } catch {
                  clients.delete(c)
                }
              }
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
