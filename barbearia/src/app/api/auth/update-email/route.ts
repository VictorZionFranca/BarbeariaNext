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

export async function PUT(request: NextRequest) {
  try {
    console.log('API route de atualização de email chamada');
    
    const { uid, newEmail } = await request.json();
    console.log('Dados recebidos:', { uid, newEmail });

    if (!uid || !newEmail) {
      console.log('UID ou novo email faltando');
      return NextResponse.json(
        { error: 'UID e novo email são obrigatórios' },
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

    console.log('Atualizando email no Firebase Auth...');
    
    // Atualizar email no Firebase Auth usando Admin SDK
    const userRecord = await getAuth().updateUser(uid, {
      email: newEmail,
    });

    console.log('Email atualizado com sucesso:', userRecord.uid);
    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      message: 'Email atualizado com sucesso'
    });

  } catch (error: unknown) {
    console.error('Erro ao atualizar email:', error);
    
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'Email já está em uso por outro usuário' },
          { status: 409 }
        );
      }
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