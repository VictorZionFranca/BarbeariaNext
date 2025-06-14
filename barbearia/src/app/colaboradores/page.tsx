"use client";

import ColaboradoresManager from "../components/ColaboradoresManager";

export default function ColaboradoresPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8 text-black">Gerenciamento de Colaboradores</h1>
            <ColaboradoresManager />
        </div>
    );
}
