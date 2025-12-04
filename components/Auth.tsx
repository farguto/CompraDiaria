import React, { useState } from 'react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isRecover, setIsRecover] = useState(false); // State for password recovery
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!auth) throw new Error("Firebase no está configurado.");
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Sign In Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
         setError(`⛔ Error de Dominio (${window.location.hostname})\n\n1. Entrá a console.firebase.google.com\n2. Tu proyecto -> Authentication -> Settings -> Authorized Domains\n3. Agregá este dominio: ${window.location.hostname}`);
      } else if (err.code === 'auth/popup-closed-by-user') {
         setError("Cerraste la ventana antes de terminar che.");
      } else if (err.code === 'auth/cancelled-popup-request') {
         setError("Se cerró la ventana emergente.");
      } else {
         setError(`No pudimos entrar con Google (${err.code}). Fijate si configuraste bien Firebase.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
        setError("Firebase no está configurado.");
        return;
    }
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Actualizar nombre de usuario si es registro
        if (name) {
            await updateProfile(userCredential.user, { displayName: name });
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
          setError("Che, el email o la contraseña no son correctos.");
      } else if (err.code === 'auth/email-already-in-use') {
          setError("Ese email ya está registrado che.");
      } else if (err.code === 'auth/weak-password') {
          setError("La contraseña es muy corta (mínimo 6 caracteres).");
      } else if (err.code === 'auth/too-many-requests') {
          setError("Intentaste muchas veces. Esperá un ratito.");
      } else if (err.code === 'auth/unauthorized-domain') {
          setError(`⛔ Error de Dominio (${window.location.hostname})\n\nAgregalo en Firebase Console -> Authentication -> Settings -> Authorized Domains.`);
      } else {
          setError("Pasó algo raro: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Poné tu email para recuperar la clave.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if(!auth) throw new Error("No config");
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg("¡Listo! Fijate en tu email que te mandamos un link para cambiar la clave.");
      setTimeout(() => {
        setIsRecover(false);
        setSuccessMsg(null);
      }, 5000);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError("Ese email no está registrado acá.");
      } else {
        setError("No pudimos mandar el mail. Probá de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700">
        
        {/* Modern Large Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center mb-4 transform rotate-3">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
             </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
             CompraDiaria
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
             Tu asistente de compras inteligente
          </p>
        </div>

        {/* Recover Password View */}
        {isRecover ? (
          <form onSubmit={handleRecoverPassword} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="text-center mb-4">
               <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Recuperar Contraseña</h2>
               <p className="text-sm text-slate-500">Te mandamos un link a tu email.</p>
             </div>

             {successMsg && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm rounded-lg border border-green-200 dark:border-green-800">
                  {successMsg}
                </div>
             )}
             {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
                  {error}
                </div>
             )}

             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none transition-all"
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar Link'}
              </button>

              <button 
                type="button"
                onClick={() => {
                  setIsRecover(false);
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="w-full py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium"
              >
                Volver al inicio
              </button>
          </form>
        ) : (
          /* Login / Register View */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Google Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 font-medium py-3 px-4 rounded-xl transition-all mb-6 shadow-sm"
            >
              {loading ? (
                 <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Entrar con Google</span>
                </>
              )}
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-slate-800 text-slate-500">o con email</span>
              </div>
            </div>

            {error && (
                <div className={`mb-4 p-3 text-sm rounded-lg ${error.includes('Dominio') ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                    <p className="whitespace-pre-line">{error}</p>
                </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                  <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none transition-all"
                    placeholder="Tu nombre"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none transition-all"
                  placeholder="nombre@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    required 
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none transition-all"
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {isLogin && (
                   <div className="mt-1 text-right">
                      <button 
                        type="button"
                        onClick={() => setIsRecover(true)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        ¿Olvidaste la clave?
                      </button>
                   </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarme')}
              </button>
            </form>

            <div className="mt-8 text-center text-sm">
              <p className="text-slate-500 dark:text-slate-400 mb-2">
                {isLogin ? '¿Todavía no tenés cuenta?' : '¿Ya estás registrado?'}
              </p>
              <button 
                onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                    setIsRecover(false);
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-base"
              >
                {isLogin ? 'Crear cuenta gratis' : 'Iniciá sesión acá'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};