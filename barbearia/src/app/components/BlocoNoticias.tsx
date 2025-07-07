"use client";
import React, { useState, useEffect } from "react";
import { FaNewspaper } from "react-icons/fa";
import { listarNoticias, Noticia } from "../utils/firestoreNoticias";
import Image from "next/image";

export default function BlocoNoticias() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [noticiaSelecionada, setNoticiaSelecionada] = useState<Noticia | null>(null);
  const [animandoSaida, setAnimandoSaida] = useState(false);

  useEffect(() => {
    async function fetchNoticias() {
      setCarregando(true);
      try {
        const todas = await listarNoticias();
        // Ordena por dataPublicacao (mais recente primeiro)
        const ativas = todas.filter((n: Noticia) => n.ativo);
        ativas.sort((a, b) => {
          if (!a.dataPublicacao || !b.dataPublicacao) return 0;
          return b.dataPublicacao.seconds - a.dataPublicacao.seconds;
        });
        setNoticias(ativas.slice(0, 3));
      } finally {
        setCarregando(false);
      }
    }
    fetchNoticias();
  }, []);

  function abrirModal(noticia: Noticia) {
    setNoticiaSelecionada(noticia);
  }
  function fecharModal() {
    setAnimandoSaida(true);
    setTimeout(() => {
      setNoticiaSelecionada(null);
      setAnimandoSaida(false);
    }, 200); // tempo igual ao da transição
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 min-h-[140px] shadow-md w-full">
      <div className="flex items-center gap-3 mb-2">
        <FaNewspaper className="text-blue-600 text-2xl" />
        <span className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Notícias</span>
      </div>
      <span className="text-xs text-gray-500 mb-2">Veja as últimas notícias e comunicados da barbearia.</span>
      {carregando ? (
        <div className="text-center text-gray-500 py-8">Carregando notícias...</div>
      ) : noticias.length === 0 ? (
        <div className="text-center text-gray-500 py-8">Nenhuma notícia ativa no momento.</div>
      ) : (
        <ul className="space-y-3">
          {noticias.map((noticia) => (
            <li
              key={noticia.id}
              className="cursor-pointer p-2 rounded-lg hover:bg-blue-50 transition-colors border border-gray-100 flex items-center gap-3"
              onClick={() => abrirModal(noticia)}
              title="Clique para ver mais"
            >
              {noticia.imagemURL && (
                <Image
                  src={noticia.imagemURL}
                  alt={noticia.titulo}
                  width={56}
                  height={48}
                  className="w-14 h-12 object-cover rounded border flex-shrink-0"
                />
              )}
              <div className="flex flex-col gap-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 truncate">{noticia.titulo}</h3>
                <div className="text-xs text-gray-500">
                  {noticia.dataPublicacao &&
                    <span>{new Date(noticia.dataPublicacao.seconds * 1000).toLocaleDateString('pt-BR')}</span>
                  }
                </div>
                <p className="text-xs text-gray-700 line-clamp-2">{noticia.conteudo}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {/* Modal de Notícia Individual */}
      {noticiaSelecionada && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-350 ${animandoSaida ? 'opacity-0' : 'opacity-100'}`}
          onClick={e => { if (e.target === e.currentTarget) fecharModal(); }}
        >
          <div
            className={`bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative transition-all duration-350 ${animandoSaida ? 'opacity-0 scale-90 translate-y-10' : 'opacity-100 scale-100 translate-y-0'}`}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={fecharModal}
              aria-label="Fechar"
              type="button"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4 text-center text-black">{noticiaSelecionada.titulo}</h2>
            <div className="flex flex-col md:flex-row gap-4 items-start mb-4">
              {noticiaSelecionada.imagemURL && (
                <Image
                  src={noticiaSelecionada.imagemURL}
                  alt={noticiaSelecionada.titulo}
                  width={160}
                  height={128}
                  className="w-40 h-32 object-cover rounded-lg border"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 mb-1">
                  {noticiaSelecionada.autor && <span>Por {noticiaSelecionada.autor} • </span>}
                  {noticiaSelecionada.dataPublicacao &&
                    <span>{new Date(noticiaSelecionada.dataPublicacao.seconds * 1000).toLocaleDateString('pt-BR')}</span>
                  }
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line">{noticiaSelecionada.conteudo}</p>
              </div>
            </div>
            <div className="flex justify-center mt-6">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                onClick={fecharModal}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
} 