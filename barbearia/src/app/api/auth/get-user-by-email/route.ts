import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Inicializar Firebase Admin SDK
if (!getApps().length) {
  try {
    console.log('Inicializando Firebase Admin SDK...');
    
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Variáveis de ambiente do Firebase Admin SDK não configuradas');
    }

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin SDK inicializado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin SDK:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('API route de busca por email chamada');
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    console.log('Email buscado:', email);

    if (!email) {
      console.log('Email não fornecido');
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o Firebase Admin está inicializado
    if (getApps().length === 0) {
      console.error('Firebase Admin SDK não inicializado');
      return NextResponse.json(
        { error: 'Serviço não disponível' },
        { status: 500 }
      );
    }

    console.log('Buscando usuário no Firebase Auth...');
    
    // Buscar usuário no Firebase Auth usando Admin SDK
    const userRecord = await getAuth().getUserByEmail(email);

    console.log('Usuário encontrado:', userRecord.uid);
    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
    });

  } catch (error: unknown) {
    console.error('Erro ao buscar usuário:', error);
    
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
} 