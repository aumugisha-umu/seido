#!/usr/bin/env node
/**
 * Générateur de rapport visuel pour les tests Seido
 * Compile les screenshots, vidéos et traces en un rapport HTML enrichi
 */

const fs = require('fs/promises')
const path = require('path')

async function main() {
  console.log('🎨 Génération du rapport visuel Seido...\n')

  try {
    // Analyser les résultats des tests
    const testResults = await analyzeTestResults()

    // Collecter les artifacts visuels
    const visualArtifacts = await collectVisualArtifacts()

    // Générer le rapport HTML enrichi
    await generateEnrichedReport(testResults, visualArtifacts)

    console.log('✅ Rapport visuel généré avec succès!')
    console.log('📖 Consultez: ./test/reports/visual-report.html')

  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error)
    process.exit(1)
  }
}

async function analyzeTestResults() {
  try {
    const reportPath = path.join(process.cwd(), 'test', 'reports', 'test-results.json')
    const reportData = await fs.readFile(reportPath, 'utf-8')
    return JSON.parse(reportData)
  } catch (error) {
    console.log('ℹ️ Pas de rapport JSON trouvé, génération basique')
    return null
  }
}

async function collectVisualArtifacts() {
  const artifacts = {
    screenshots: [],
    videos: [],
    traces: []
  }

  try {
    const testResultsDir = path.join(process.cwd(), 'test', 'test-results')
    const files = await fs.readdir(testResultsDir, { recursive: true, withFileTypes: true })

    for (const file of files) {
      if (file.isFile()) {
        const fileName = file.name
        const fullPath = path.join(file.path || '', fileName)

        if (fileName.endsWith('.png')) {
          artifacts.screenshots.push({
            name: fileName,
            path: fullPath,
            size: await getFileSize(fullPath),
            timestamp: await getFileTimestamp(fullPath)
          })
        } else if (fileName.endsWith('.webm') || fileName.endsWith('.mp4')) {
          artifacts.videos.push({
            name: fileName,
            path: fullPath,
            size: await getFileSize(fullPath),
            timestamp: await getFileTimestamp(fullPath)
          })
        } else if (fileName.endsWith('.zip') && fileName.includes('trace')) {
          artifacts.traces.push({
            name: fileName,
            path: fullPath,
            size: await getFileSize(fullPath),
            timestamp: await getFileTimestamp(fullPath)
          })
        }
      }
    }
  } catch (error) {
    console.log('ℹ️ Dossier test-results non trouvé')
  }

  // Trier par timestamp
  artifacts.screenshots.sort((a, b) => b.timestamp - a.timestamp)
  artifacts.videos.sort((a, b) => b.timestamp - a.timestamp)
  artifacts.traces.sort((a, b) => b.timestamp - a.timestamp)

  return artifacts
}

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath)
    return stats.size
  } catch {
    return 0
  }
}

async function getFileTimestamp(filePath) {
  try {
    const stats = await fs.stat(filePath)
    return stats.mtime.getTime()
  } catch {
    return 0
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function generateEnrichedReport(testResults, artifacts) {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport Visuel Tests Seido</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #334155;
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .header {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      text-align: center;
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .header p {
      opacity: 0.9;
      font-size: 1.1rem;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      text-align: center;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      color: #3b82f6;
    }

    .stat-label {
      font-size: 0.9rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .section h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #1e293b;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 0.5rem;
    }

    .artifact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .artifact-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      transition: transform 0.2s;
    }

    .artifact-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .artifact-preview {
      height: 200px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .artifact-preview img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .artifact-preview video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .artifact-info {
      padding: 1rem;
    }

    .artifact-name {
      font-weight: 600;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .artifact-meta {
      font-size: 0.8rem;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }

    .no-artifacts {
      text-align: center;
      color: #64748b;
      font-style: italic;
      padding: 2rem;
    }

    .trace-icon, .video-icon {
      font-size: 3rem;
      color: #94a3b8;
    }

    .timestamp {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-success { background: #dcfce7; color: #166534; }
    .badge-error { background: #fef2f2; color: #dc2626; }
    .badge-warning { background: #fef3c7; color: #d97706; }

    @media (max-width: 768px) {
      .container { padding: 1rem; }
      .header h1 { font-size: 2rem; }
      .artifact-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎭 Rapport Visuel Tests Seido</h1>
      <p>Captures d'écran, vidéos et traces d'exécution</p>
      <p class="timestamp">Généré le ${new Date().toLocaleString('fr-FR')}</p>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">${artifacts.screenshots.length}</div>
        <div class="stat-label">Screenshots</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${artifacts.videos.length}</div>
        <div class="stat-label">Vidéos</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${artifacts.traces.length}</div>
        <div class="stat-label">Traces</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${formatFileSize(
          [...artifacts.screenshots, ...artifacts.videos, ...artifacts.traces]
            .reduce((sum, artifact) => sum + artifact.size, 0)
        )}</div>
        <div class="stat-label">Taille totale</div>
      </div>
    </div>

    ${generateScreenshotsSection(artifacts.screenshots)}
    ${generateVideosSection(artifacts.videos)}
    ${generateTracesSection(artifacts.traces)}
  </div>

  <script>
    // Ajouter la fonctionnalité de lightbox pour les images
    document.querySelectorAll('.artifact-preview img').forEach(img => {
      img.addEventListener('click', () => {
        const lightbox = document.createElement('div');
        lightbox.style.cssText = \`
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.9); display: flex; align-items: center;
          justify-content: center; z-index: 1000; cursor: pointer;
        \`;

        const enlargedImg = img.cloneNode();
        enlargedImg.style.cssText = 'max-width: 90%; max-height: 90%; object-fit: contain;';

        lightbox.appendChild(enlargedImg);
        document.body.appendChild(lightbox);

        lightbox.addEventListener('click', () => {
          document.body.removeChild(lightbox);
        });
      });
    });
  </script>
</body>
</html>`

  const reportPath = path.join(process.cwd(), 'test', 'reports', 'visual-report.html')
  await fs.writeFile(reportPath, html)
}

function generateScreenshotsSection(screenshots) {
  if (screenshots.length === 0) {
    return `
    <div class="section">
      <h2>📸 Captures d'écran</h2>
      <div class="no-artifacts">Aucune capture d'écran trouvée</div>
    </div>`
  }

  const screenshotCards = screenshots.map(screenshot => `
    <div class="artifact-card">
      <div class="artifact-preview">
        <img src="${path.relative(path.join(process.cwd(), 'test', 'reports'), screenshot.path)}"
             alt="${screenshot.name}"
             title="Cliquez pour agrandir">
      </div>
      <div class="artifact-info">
        <div class="artifact-name">${screenshot.name}</div>
        <div class="artifact-meta">
          <span>${formatFileSize(screenshot.size)}</span>
          <span class="timestamp">${new Date(screenshot.timestamp).toLocaleString('fr-FR')}</span>
        </div>
      </div>
    </div>
  `).join('')

  return `
  <div class="section">
    <h2>📸 Captures d'écran (${screenshots.length})</h2>
    <div class="artifact-grid">
      ${screenshotCards}
    </div>
  </div>`
}

function generateVideosSection(videos) {
  if (videos.length === 0) {
    return `
    <div class="section">
      <h2>🎥 Vidéos</h2>
      <div class="no-artifacts">Aucune vidéo trouvée</div>
    </div>`
  }

  const videoCards = videos.map(video => `
    <div class="artifact-card">
      <div class="artifact-preview">
        <video controls preload="metadata">
          <source src="${path.relative(path.join(process.cwd(), 'test', 'reports'), video.path)}" type="video/webm">
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
      </div>
      <div class="artifact-info">
        <div class="artifact-name">${video.name}</div>
        <div class="artifact-meta">
          <span>${formatFileSize(video.size)}</span>
          <span class="timestamp">${new Date(video.timestamp).toLocaleString('fr-FR')}</span>
        </div>
      </div>
    </div>
  `).join('')

  return `
  <div class="section">
    <h2>🎥 Vidéos (${videos.length})</h2>
    <div class="artifact-grid">
      ${videoCards}
    </div>
  </div>`
}

function generateTracesSection(traces) {
  if (traces.length === 0) {
    return `
    <div class="section">
      <h2>🔍 Traces</h2>
      <div class="no-artifacts">Aucune trace trouvée</div>
    </div>`
  }

  const traceCards = traces.map(trace => `
    <div class="artifact-card">
      <div class="artifact-preview">
        <div class="trace-icon">📊</div>
      </div>
      <div class="artifact-info">
        <div class="artifact-name">${trace.name}</div>
        <div class="artifact-meta">
          <span>${formatFileSize(trace.size)}</span>
          <span class="timestamp">${new Date(trace.timestamp).toLocaleString('fr-FR')}</span>
        </div>
        <div style="margin-top: 0.5rem;">
          <small>Ouvrir avec: <code>npx playwright show-trace ${trace.path}</code></small>
        </div>
      </div>
    </div>
  `).join('')

  return `
  <div class="section">
    <h2>🔍 Traces (${traces.length})</h2>
    <div class="artifact-grid">
      ${traceCards}
    </div>
  </div>`
}

main().catch(console.error)