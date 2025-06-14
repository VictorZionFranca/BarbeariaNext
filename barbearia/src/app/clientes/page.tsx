"use client";

import ClientesManager from "../components/ClientesManager";

export default function ClientesPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8 text-black">Gerenciamento de Clientes</h1>
            <ClientesManager />
        </div>
    );
}
