"use client";

import { useState, useEffect, useRef } from "react";
// import { createPortal } from "react-dom"; // Removido pois não é usado
import { Cliente, buscarClientesPorNome } from "../utils/firestoreClientes";
// import { buscarClientePorId } from "../utils/firestoreClientes"; // Removido pois não é usado

interface ClienteSearchProps {
  onClienteSelect: (cliente: Cliente) => void;
  selectedCliente?: Cliente | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function ClienteSearch({ 
  onClienteSelect, 
  selectedCliente, 
  placeholder = "Buscar cliente...",
  className = "",
  disabled = false
}: ClienteSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Buscar clientes quando o termo de busca mudar
  useEffect(() => {
    const searchClientes = async () => {
      if (!searchTerm.trim()) {
        setClientes([]);
        setShowDropdown(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const resultados = await buscarClientesPorNome(searchTerm);
        setClientes(resultados);
        setShowDropdown(true);
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        setClientes([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchClientes, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Atualizar input quando cliente selecionado mudar
  useEffect(() => {
    if (selectedCliente) {
      setSearchTerm(selectedCliente.nomeCompleto);
      setShowDropdown(false);
    } else {
      setSearchTerm("");
      setShowDropdown(false);
    }
  }, [selectedCliente]);

  const handleClienteSelect = (cliente: Cliente) => {
    onClienteSelect(cliente);
    setSearchTerm(cliente.nomeCompleto);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Se o campo estiver vazio, limpar a seleção
    if (!value.trim()) {
      onClienteSelect({} as Cliente); // Limpar seleção
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input de busca */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black w-full"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          autoComplete="off"
          disabled={disabled}
          onFocus={() => {
            if (searchTerm.trim()) setShowDropdown(true);
          }}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
          </div>
        )}
      </div>

      {/* Dropdown de resultados */}
      {showDropdown && searchTerm.trim() && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {clientes.length > 0 ? (
            <>
              {clientes.map((cliente) => (
                <div
                  key={cliente.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => handleClienteSelect(cliente)}
                >
                  <div className="font-medium text-black">{cliente.nomeCompleto}</div>
                  <div className="text-sm text-gray-600">{cliente.email}</div>
                </div>
              ))}
            </>
          ) : !isLoading ? (
            <div className="px-4 py-3 text-center text-gray-500">
              <div>Nenhum cliente encontrado</div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
} 