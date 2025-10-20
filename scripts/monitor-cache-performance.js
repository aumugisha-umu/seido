#!/usr/bin/env node

/**
 * Cache Performance Monitor
 *
 * Script pour surveiller les performances du cache en temps réel
 * Usage: npm run monitor:cache
 */

const https = require('http')
const chalk = require('chalk')
const Table = require('cli-table3')

const API_URL = 'http://localhost:3000/api/cache-metrics'
const REFRESH_INTERVAL = 2000 // 2 secondes

// Variables pour le suivi des tendances
let previousHitRate = 0
let previousTotal = 0
let samples = []
const MAX_SAMPLES = 30

// Effacer l'écran
function clearScreen() {
  process.stdout.write('\x1Bc')
}

// Formater le pourcentage avec couleur
function formatPercent(value, target = 80) {
  const percent = parseFloat(value)

  if (percent >= target) {
    return chalk.green(`${value}%`)
  } else if (percent >= target * 0.75) {
    return chalk.yellow(`${value}%`)
  } else {
    return chalk.red(`${value}%`)
  }
}

// Calculer la tendance
function getTrend(current, previous) {
  if (current > previous) {
    return chalk.green('↑')
  } else if (current < previous) {
    return chalk.red('↓')
  }
  return chalk.gray('→')
}

// Afficher le graphique ASCII
function renderGraph(samples, maxValue = 100) {
  const height = 10
  const width = Math.min(samples.length, 50)

  if (samples.length === 0) return ''

  const graph = []

  // Calculer les barres
  for (let row = height; row > 0; row--) {
    let line = ''
    const threshold = (row / height) * maxValue

    for (let i = samples.length - width; i < samples.length; i++) {
      if (i < 0) continue
      const value = samples[i]

      if (value >= threshold) {
        line += chalk.cyan('█')
      } else {
        line += ' '
      }
    }

    // Ajouter l'axe Y
    const label = `${Math.round(threshold).toString().padStart(3)}% │`
    graph.push(chalk.gray(label) + line)
  }

  // Ajouter l'axe X
  const xAxis = '     └' + '─'.repeat(width)
  graph.push(chalk.gray(xAxis))
  graph.push(chalk.gray(`      ${width} samples (${REFRESH_INTERVAL / 1000}s interval)`))

  return graph.join('\n')
}

// Récupérer les métriques
async function fetchMetrics() {
  return new Promise((resolve, reject) => {
    https.get(API_URL, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json)
        } catch (error) {
          reject(error)
        }
      })
    }).on('error', reject)
  })
}

// Afficher les métriques
function displayMetrics(metrics) {
  clearScreen()

  // Header
  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════╗'))
  console.log(chalk.bold.cyan('║   SEIDO CACHE PERFORMANCE MONITOR   ║'))
  console.log(chalk.bold.cyan('╚══════════════════════════════════════╝\n'))

  // Summary
  const hitRate = parseFloat(metrics.summary.globalHitRate)
  const trend = getTrend(hitRate, previousHitRate)

  console.log(chalk.bold('📊 SUMMARY'))
  console.log(`   Hit Rate: ${formatPercent(metrics.summary.globalHitRate)} ${trend}`)
  console.log(`   Total Entries: ${metrics.memory.total} ${getTrend(metrics.memory.total, previousTotal)}`)
  console.log(`   Status: ${getStatusBadge(metrics.health.status)}`)
  console.log()

  // Memory Usage Table
  const memoryTable = new Table({
    head: ['Cache Type', 'Entries', 'Usage'],
    style: { head: ['cyan'] }
  })

  const totalMemory = metrics.memory.total || 1

  memoryTable.push(
    ['Profiles', metrics.memory.profiles, getBar(metrics.memory.profiles, totalMemory)],
    ['Permissions', metrics.memory.permissions, getBar(metrics.memory.permissions, totalMemory)],
    ['Teams', metrics.memory.teams, getBar(metrics.memory.teams, totalMemory)],
    ['Sessions', metrics.memory.sessions, getBar(metrics.memory.sessions, totalMemory)]
  )

  console.log(chalk.bold('💾 MEMORY USAGE'))
  console.log(memoryTable.toString())
  console.log()

  // Performance Details
  if (metrics.performance) {
    const perfTable = new Table({
      head: ['Metric', 'Hits', 'Misses', 'Hit Rate', 'Evictions'],
      style: { head: ['cyan'] }
    })

    for (const [key, stats] of Object.entries(metrics.performance)) {
      perfTable.push([
        key.charAt(0).toUpperCase() + key.slice(1),
        stats.hits || 0,
        stats.misses || 0,
        formatPercent(stats.hitRate.toFixed(1)),
        stats.evictions || 0
      ])
    }

    console.log(chalk.bold('⚡ PERFORMANCE DETAILS'))
    console.log(perfTable.toString())
    console.log()
  }

  // Hit Rate Graph
  samples.push(hitRate)
  if (samples.length > MAX_SAMPLES) {
    samples.shift()
  }

  console.log(chalk.bold('📈 HIT RATE TREND'))
  console.log(renderGraph(samples))
  console.log()

  // Recommendations
  if (metrics.health.suggestions && metrics.health.suggestions.length > 0) {
    console.log(chalk.bold('💡 SUGGESTIONS'))
    metrics.health.suggestions.forEach(suggestion => {
      console.log(`   • ${suggestion}`)
    })
    console.log()
  }

  // Footer
  console.log(chalk.gray('─'.repeat(50)))
  console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}`))
  console.log(chalk.gray('Press Ctrl+C to exit'))

  // Update previous values
  previousHitRate = hitRate
  previousTotal = metrics.memory.total
}

// Obtenir un badge de statut
function getStatusBadge(status) {
  const badges = {
    excellent: chalk.bgGreen.white(' EXCELLENT '),
    good: chalk.bgBlue.white(' GOOD '),
    fair: chalk.bgYellow.black(' FAIR '),
    poor: chalk.bgRed.white(' POOR ')
  }

  return badges[status] || chalk.bgGray.white(' UNKNOWN ')
}

// Obtenir une barre de progression
function getBar(value, max, width = 20) {
  const percentage = (value / max) * 100
  const filled = Math.round((percentage / 100) * width)
  const empty = width - filled

  let color = chalk.green
  if (percentage > 80) color = chalk.red
  else if (percentage > 60) color = chalk.yellow

  return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty)) + ` ${percentage.toFixed(1)}%`
}

// Fonction principale
async function monitor() {
  try {
    const metrics = await fetchMetrics()

    if (metrics.error) {
      console.error(chalk.red(`\n❌ Error: ${metrics.error}\n`))

      if (metrics.error.includes('development mode')) {
        console.log(chalk.yellow('ℹ️  Cache metrics are only available in development mode.'))
        console.log(chalk.yellow('   Make sure NODE_ENV=development is set.\n'))
      }

      process.exit(1)
    }

    displayMetrics(metrics)
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to fetch metrics:'), error.message)
    console.log(chalk.yellow('\nMake sure the Next.js server is running on http://localhost:3000\n'))
  }
}

// Gérer Ctrl+C proprement
process.on('SIGINT', () => {
  console.log(chalk.cyan('\n\n👋 Cache monitor stopped.\n'))
  process.exit(0)
})

// Message de démarrage
console.log(chalk.cyan('\n🚀 Starting cache performance monitor...'))
console.log(chalk.gray('   Fetching metrics every 2 seconds...\n'))

// Démarrer le monitoring
monitor()
setInterval(monitor, REFRESH_INTERVAL)