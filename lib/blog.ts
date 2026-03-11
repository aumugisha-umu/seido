import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { unstable_cache } from 'next/cache'

const ARTICLES_DIR = path.join(process.cwd(), 'blog', 'articles')

export interface ArticleMeta {
  slug: string
  title: string
  date: string
  author: string
  category: string
  tags: string[]
  description: string
  reading_time: string
  type: string
  hub: string
}

export interface Article extends ArticleMeta {
  content: string
}

const parseArticleFile = (filename: string): Article | null => {
  const filePath = path.join(ARTICLES_DIR, filename)
  const fileContents = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(fileContents)

  if (!data.slug || !data.title || !data.date) {
    return null
  }

  return {
    slug: data.slug,
    title: data.title,
    date: data.date,
    author: data.author || 'Equipe Seido',
    category: data.category || 'General',
    tags: data.tags || [],
    description: data.description || '',
    reading_time: data.reading_time || '5 min',
    type: data.type || 'article',
    hub: data.hub || '',
    content,
  }
}

// ✅ PERF: Raw function for internal use (no cache)
const getAllArticlesRaw = async (): Promise<Article[]> => {
  if (!fs.existsSync(ARTICLES_DIR)) {
    return []
  }

  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.md'))

  const articles = files
    .map(parseArticleFile)
    .filter((a): a is Article => a !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return articles
}

// ✅ PERF: Cached version — blog content only changes on deploy (1h TTL)
export const getAllArticles = unstable_cache(
  getAllArticlesRaw,
  ['blog-articles'],
  { revalidate: 3600, tags: ['blog-articles'] }
)

export const getArticleBySlug = async (slug: string): Promise<Article | null> => {
  const articles = await getAllArticles()
  return articles.find((a) => a.slug === slug) || null
}

export const getLatestArticles = async (n: number): Promise<ArticleMeta[]> => {
  const articles = await getAllArticles()
  return articles
    .filter((a) => a.type !== 'hub')
    .slice(0, n)
    .map(({ content: _content, ...meta }) => meta)
}

export const getArticlesByHub = async (hubSlug: string): Promise<ArticleMeta[]> => {
  const articles = await getAllArticles()
  return articles
    .filter((a) => a.hub === hubSlug)
    .map(({ content: _content, ...meta }) => meta)
}

export const getAllCategories = async (): Promise<string[]> => {
  const articles = await getAllArticles()
  const categories = new Set(articles.map((a) => a.category))
  return Array.from(categories).sort()
}

export const getAllTags = async (): Promise<string[]> => {
  const articles = await getAllArticles()
  const tags = new Set(articles.flatMap((a) => a.tags))
  return Array.from(tags).sort()
}

export const getAllSlugs = async (): Promise<string[]> => {
  const articles = await getAllArticles()
  return articles.map((a) => a.slug)
}
