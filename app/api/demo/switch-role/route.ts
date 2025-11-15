/**
 * API Route: Demo - Switch Role
 * Gère le changement de rôle en mode démo
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { role, userId } = body

    // Valider le rôle
    const validRoles = ['gestionnaire', 'locataire', 'prestataire', 'admin']
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Créer la réponse
    const response = NextResponse.json({ success: true, role, userId })

    // Définir les cookies
    response.cookies.set('demo_mode', 'true', {
      httpOnly: false,
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 heure
      path: '/'
    })

    response.cookies.set('demo_role', role, {
      httpOnly: false,
      sameSite: 'strict',
      maxAge: 60 * 60,
      path: '/'
    })

    // Si un userId est fourni, le stocker également
    if (userId) {
      response.cookies.set('demo_user_id', userId, {
        httpOnly: false,
        sameSite: 'strict',
        maxAge: 60 * 60,
        path: '/'
      })
    } else {
      // Supprimer le cookie si pas d'userId
      response.cookies.delete('demo_user_id')
    }

    return response
  } catch (error) {
    console.error('Error switching demo role:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
