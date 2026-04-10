import { useEffect, useState } from "react";
import { Link } from "wouter";

export default function VerificarEmail() {
  const token = new URLSearchParams(window.location.search).get("token");
  const error = new URLSearchParams(window.location.search).get("error");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    error ? "error" : token ? "loading" : "error"
  );

  const API_BASE = import.meta.env.VITE_API_BASE ?? "";

  useEffect(() => {
    if (!token || error) return;

    window.location.href = `${API_BASE}/api/auth/verify-email?token=${token}`;
  }, [token, error]);

  return (
    <div className="min-h-screen bg-[#3a2512] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-extrabold text-2xl text-[#d97706]">Hub</span>
          <span className="font-extrabold text-2xl text-white ml-1">Lojista</span>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          {status === "loading" && (
            <>
              <div className="w-12 h-12 border-4 border-[#d97706] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Verificando seu email...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Link inválido ou expirado</h2>
              <p className="text-sm text-gray-500 mb-6">
                Este link de verificação é inválido ou já foi usado. Solicite um novo cadastro ou entre em contato.
              </p>
              <Link
                href="/lojista/login"
                className="inline-block bg-[#d97706] text-white font-bold px-6 py-2.5 rounded-xl hover:bg-[#b45309] transition-colors text-sm"
              >
                Ir para o login
              </Link>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Email confirmado!</h2>
              <p className="text-sm text-gray-500 mb-6">
                Seu email foi verificado com sucesso. Agora é só aguardar a aprovação da nossa equipe.
              </p>
              <Link
                href="/lojista/login"
                className="inline-block bg-[#d97706] text-white font-bold px-6 py-2.5 rounded-xl hover:bg-[#b45309] transition-colors text-sm"
              >
                Fazer login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
