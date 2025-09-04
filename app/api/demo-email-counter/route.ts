import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const COUNTER_FILE_PATH = join(process.cwd(), 'data', 'email-counter.json')

interface EmailCounter {
  lastEmailNumber: number
  createdAt: string
  updatedAt: string
  totalDemoEnvironmentsCreated: number
}

// Fonction pour lire le fichier compteur
function readCounter(): EmailCounter {
  try {
    if (!existsSync(COUNTER_FILE_PATH)) {
      // Créer le fichier s'il n'existe pas
      const initialData: EmailCounter = {
        lastEmailNumber: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalDemoEnvironmentsCreated: 0
      }
      writeFileSync(COUNTER_FILE_PATH, JSON.stringify(initialData, null, 2))
      return initialData
    }

    const fileContent = readFileSync(COUNTER_FILE_PATH, 'utf8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('Error reading email counter file:', error)
    // Retourner des valeurs par défaut en cas d'erreur
    return {
      lastEmailNumber: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalDemoEnvironmentsCreated: 0
    }
  }
}

// Fonction pour écrire dans le fichier compteur
function writeCounter(data: EmailCounter): void {
  try {
    writeFileSync(COUNTER_FILE_PATH, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error writing email counter file:', error)
    throw error
  }
}

// GET - Obtenir le prochain numéro email disponible
export async function GET() {
  try {
    const counter = readCounter()
    const nextNumber = counter.lastEmailNumber + 1
    
    console.log(`📧 Next email number requested: ${nextNumber}`)
    
    return NextResponse.json({
      nextEmailNumber: nextNumber,
      lastUsed: counter.lastEmailNumber,
      totalEnvironments: counter.totalDemoEnvironmentsCreated
    })
  } catch (error) {
    console.error('Error in GET /api/demo-email-counter:', error)
    return NextResponse.json(
      { error: 'Failed to read email counter' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour le dernier numéro utilisé
export async function PUT(request: NextRequest) {
  try {
    const { lastEmailNumber } = await request.json()
    
    if (typeof lastEmailNumber !== 'number' || lastEmailNumber < 0) {
      return NextResponse.json(
        { error: 'Invalid lastEmailNumber' },
        { status: 400 }
      )
    }

    const counter = readCounter()
    const updatedCounter: EmailCounter = {
      ...counter,
      lastEmailNumber,
      updatedAt: new Date().toISOString(),
      totalDemoEnvironmentsCreated: counter.totalDemoEnvironmentsCreated + 1
    }

    writeCounter(updatedCounter)
    
    console.log(`📧 Email counter updated to: ${lastEmailNumber}`)
    console.log(`🎯 Total demo environments created: ${updatedCounter.totalDemoEnvironmentsCreated}`)
    
    return NextResponse.json({
      success: true,
      lastEmailNumber: updatedCounter.lastEmailNumber,
      totalEnvironments: updatedCounter.totalDemoEnvironmentsCreated
    })
  } catch (error) {
    console.error('Error in PUT /api/demo-email-counter:', error)
    return NextResponse.json(
      { error: 'Failed to update email counter' },
      { status: 500 }
    )
  }
}
