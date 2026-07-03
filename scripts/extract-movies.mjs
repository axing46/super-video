/**
 * Extract top-rated movies from Douban CSV into a JSON file for the app.
 * Usage: node scripts/extract-movies.mjs
 */

import fs from 'node:fs'
import path from 'node:path'

const CSV_PATH = path.resolve('temp_data/extracted/movie.csv')
const OUT_PATH = path.resolve('public/movies.json')

const raw = fs.readFileSync(CSV_PATH, 'utf-8')
const lines = raw.trim().split('\n')

// Skip header
const header = lines[0]
console.log('CSV header:', header)

const movies = []

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim()
  if (!line) continue

  const parts = line.split(',')
  if (parts.length < 7) continue

  const type = parts[0]
  const cast = parts[1]
  const region = parts[2]
  const director = parts[3]
  const genreTag = parts[4]
  const ratingStr = parts[5]
  const title = parts.slice(6).join(',') // Title may contain commas

  const rating = parseFloat(ratingStr)
  if (isNaN(rating) || rating < 7.5) continue

  movies.push({
    title,
    type,
    cast: cast.split('|').filter(Boolean).slice(0, 3),
    region,
    director,
    genre: genreTag,
    rating,
  })
}

// Sort by rating descending
movies.sort((a, b) => b.rating - a.rating)

// Deduplicate by title (keep highest rated)
const seen = new Set()
const deduped = []
for (const m of movies) {
  if (!seen.has(m.title)) {
    seen.add(m.title)
    deduped.push(m)
  }
}

// Limit to top 5000
const top = deduped.slice(0, 5000)

console.log(`After dedup: ${deduped.length}`)
console.log(`Top 5000: ${top.length}`)
console.log(`Top 5:`)
top.slice(0, 5).forEach((m, i) => console.log(`  ${i + 1}. ${m.title} (${m.rating}) - ${m.type}`))

fs.writeFileSync(OUT_PATH, JSON.stringify(top, null, 2), 'utf-8')
console.log(`Written to ${OUT_PATH} (${(fs.statSync(OUT_PATH).size / 1024).toFixed(0)} KB)`)
