/**
 * Quick cache test to verify functionality
 */

// Mock the cache for testing
class SimpleCacheManager {
  constructor() {
    this.cache = new Map()
    this.metrics = {
      hits: 0,
      misses: 0
    }
  }

  set(key, value, ttl = 60000) {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl
    })
    console.log(`✅ Cache SET: ${key}`)
  }

  get(key) {
    const entry = this.cache.get(key)
    if (!entry) {
      this.metrics.misses++
      console.log(`❌ Cache MISS: ${key}`)
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.metrics.misses++
      console.log(`⏰ Cache EXPIRED: ${key}`)
      return null
    }

    this.metrics.hits++
    console.log(`✅ Cache HIT: ${key}`)
    return entry.data
  }

  clear() {
    const size = this.cache.size
    this.cache.clear()
    console.log(`🗑️ Cache CLEARED: ${size} entries removed`)
  }

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0
    return {
      hitRate,
      size: this.cache.size,
      memoryUsage: this.cache.size * 0.5, // Rough estimate
      hits: this.metrics.hits,
      misses: this.metrics.misses
    }
  }
}

// Run tests
console.log('🧪 CACHE SYSTEM TEST')
console.log('=' . repeat(50))

const cache = new SimpleCacheManager()

// Test 1: Basic set/get
console.log('\n📌 Test 1: Basic Operations')
cache.set('user-123', { id: '123', name: 'Test User' })
const user = cache.get('user-123')
console.log('Retrieved:', user)

// Test 2: Cache miss
console.log('\n📌 Test 2: Cache Miss')
const missing = cache.get('non-existent')
console.log('Missing data:', missing)

// Test 3: Multiple entries
console.log('\n📌 Test 3: Multiple Entries')
cache.set('profile-1', { id: '1' })
cache.set('profile-2', { id: '2' })
cache.set('profile-3', { id: '3' })

// Test 4: Metrics
console.log('\n📌 Test 4: Metrics')
const metrics = cache.getMetrics()
console.log('Cache Metrics:')
console.log(`  Hit Rate: ${metrics.hitRate.toFixed(1)}%`)
console.log(`  Size: ${metrics.size} entries`)
console.log(`  Hits: ${metrics.hits}`)
console.log(`  Misses: ${metrics.misses}`)

// Test 5: Clear cache
console.log('\n📌 Test 5: Clear Cache')
cache.clear()
const afterClear = cache.get('user-123')
console.log('After clear:', afterClear)

// Test 6: Expiration
console.log('\n📌 Test 6: Expiration')
cache.set('temp-data', { temp: true }, 100) // 100ms TTL
console.log('Immediate get:', cache.get('temp-data'))
setTimeout(() => {
  console.log('After 150ms:', cache.get('temp-data'))

  // Final metrics
  console.log('\n📊 FINAL METRICS')
  const finalMetrics = cache.getMetrics()
  console.log(`  Hit Rate: ${finalMetrics.hitRate.toFixed(1)}%`)
  console.log(`  Total Hits: ${finalMetrics.hits}`)
  console.log(`  Total Misses: ${finalMetrics.misses}`)

  console.log('\n✅ CACHE TESTS COMPLETE')
}, 150)