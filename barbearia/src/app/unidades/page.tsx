import React from "react";
import UnidadesManager from "../components/UnidadesManager";

const UnidadesPage = () => {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4 text-black">Unidades / Filiais</h1>
            <UnidadesManager />
        </div>
    );
};

export default UnidadesPage;