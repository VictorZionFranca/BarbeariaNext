import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Inicializar Firebase Admin SDK
if (!getApps().length) {
  try {
    console.log('Inicializando Firebase Admin SDK...');
    console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('Private Key exists:', !!process.env.FIREBASE_PRIVATE_KEY);
    
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

export async function POST(request: NextRequest) {
  try {
    console.log('API route chamada');
    
    const { email, password, displayName } = await request.json();
    console.log('Dados recebidos:', { email, displayName, password: '***' });

    if (!email || !password || !displayName) {
      console.log('Dados obrigatórios faltando');
      return NextResponse.json(
        { error: 'Email, senha e nome são obrigatórios' },
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

    console.log('Criando usuário no Firebase Auth...');
    // Criar usuário no Firebase Auth usando Admin SDK
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName,
    });

    console.log('Usuário criado com sucesso:', userRecord.uid);
    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      message: 'Conta criada com sucesso'
    });

  } catch (error: unknown) {
    console.error('Erro ao criar conta:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
} 