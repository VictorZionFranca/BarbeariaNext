import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../../lib/firebaseConfig';

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

    console.log('Criando usuário no Firebase Auth...');
    
    // Criar usuário no Firebase Auth usando SDK do cliente
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('Usuário criado com sucesso:', user.uid);
    return NextResponse.json({
      success: true,
      uid: user.uid,
      message: 'Conta criada com sucesso'
    });

  } catch (error: unknown) {
    console.error('Erro ao criar conta:', error);
    
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/email-already-in-use') {
        return NextResponse.json(
          { error: 'Email já cadastrado' },
          { status: 409 }
        );
      }
      if (error.code === 'auth/weak-password') {
        return NextResponse.json(
          { error: 'Senha muito fraca' },
          { status: 400 }
        );
      }
      if (error.code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: 'Email inválido' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
} 