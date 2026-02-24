import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  Play, Settings, Maximize, Save, Link as LinkIcon,
  Lock, Unlock, HelpCircle, QrCode, Upload, Loader2
} from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE (LOCAL) ---
// Substitua o objeto abaixo pelos dados que você pega no Console do Firebase
const localFirebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Lógica para detectar se está no ambiente do Canvas ou Local
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : localFirebaseConfig;

let app, auth, db, storage;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'video-player-app';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('player');
  const [showGuide, setShowGuide] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [videoConfig, setVideoConfig] = useState({
    url: '',
    title: 'Vídeo Escolar',
    adminPassword: 'admin',
    autoPlay: true
  });
  const [inputUrl, setInputUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Estados de Upload
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // 1. Autenticação (REGRA 3: Auth antes de Queries)
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          // Não importa signInWithCustomToken aqui para brevidade, usando anônimo como fallback seguro
          await signInAnonymously(auth);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Erro na autenticação:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Sincronização de Dados (REGRA 1: Caminhos Estritos)
  useEffect(() => {
    if (!user || !db) return;

    // /artifacts/{appId}/public/data/{collectionName}/{documentId}
    const configDoc = doc(db, 'artifacts', appId, 'public', 'data', 'video_settings', 'main_config');

    const unsubscribe = onSnapshot(configDoc, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setVideoConfig(prev => ({
          ...prev,
          url: data.url || '',
          title: data.title || 'Vídeo Escolar',
          adminPassword: data.adminPassword || 'admin'
        }));
        setInputUrl(data.url || '');
        setNewPassword(data.adminPassword || 'admin');
      } else {
        // Inicializa se não existir
        setDoc(configDoc, {
          url: '',
          title: 'Vídeo Escolar',
          adminPassword: 'admin',
          createdAt: new Date().toISOString()
        }).catch(err => console.error("Erro ao criar config inicial:", err));
      }
    }, (error) => {
      console.error("Erro no Firestore (verifique permissões):", error);
    });

    return () => unsubscribe();
  }, [user]);

  const saveConfig = async () => {
    if (!user || !db) return;
    setStatus('A guardar...');
    try {
      const configDoc = doc(db, 'artifacts', appId, 'public', 'data', 'video_settings', 'main_config');
      await setDoc(configDoc, {
        url: inputUrl,
        adminPassword: newPassword,
        title: videoConfig.title,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      setStatus('Configurações guardadas!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus('Erro ao guardar.');
      console.error(error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFileUpload = () => {
    if (!selectedFile || !storage) return;

    setIsUploading(true);
    setStatus('Iniciando upload...');
    const storageRef = ref(storage, `artifacts/${appId}/videos/${Date.now()}_${selectedFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload error:", error);
        setStatus('Erro no upload.');
        setIsUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setInputUrl(downloadURL);
          setIsUploading(false);
          setSelectedFile(null);
          setUploadProgress(0);
          setStatus('Upload concluído! Clique em Guardar.');
          setTimeout(() => setStatus(''), 5000);
        });
      }
    );
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordAttempt === videoConfig.adminPassword) {
      setIsAuthorized(true);
      setPasswordAttempt('');
      setStatus('');
    } else {
      setStatus('Senha incorreta!');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.() ||
      containerRef.current.webkitRequestFullscreen?.() ||
      containerRef.current.msRequestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleStartVideo = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.error("Erro ao dar play:", e));
      toggleFullScreen();
    }
  };

  // UI de ADMINISTRAÇÃO
  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center justify-center font-sans">
        {!isAuthorized ? (
          <form onSubmit={handleLogin} className="w-full max-w-sm bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center">
            <div className="bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="text-blue-400" size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2">Painel de Controlo</h2>
            <p className="text-slate-400 text-sm mb-6">Insira a senha de administrador</p>
            <input
              type="password"
              value={passwordAttempt}
              onChange={(e) => setPasswordAttempt(e.target.value)}
              placeholder="Senha de acesso"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 mb-4 text-center focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
            <button className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold transition-all mb-4">Entrar</button>
            <button type="button" onClick={() => setView('player')} className="text-slate-500 text-sm hover:text-white transition-colors">Voltar ao Vídeo</button>
            {status && <p className="mt-4 text-red-400 text-sm">{typeof status === 'string' ? status : ''}</p>}
          </form>
        ) : (
          <div className="w-full max-w-2xl animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="text-blue-400" /> Configurações
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="flex items-center gap-2 text-sm bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg border border-blue-500/30 hover:bg-blue-600/30"
                >
                  <HelpCircle size={18} /> {showGuide ? 'Fechar Guia' : 'Ajuda'}
                </button>
                <button
                  onClick={() => { setIsAuthorized(false); setView('player'); }}
                  className="text-sm bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"
                >
                  Sair
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                  <h3 className="text-sm font-bold text-blue-400 uppercase mb-4 flex items-center gap-2">
                    <Upload size={16} /> Hospedagem de Vídeo
                  </h3>
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Carregar arquivo local</label>
                    <div className="flex flex-col gap-3">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer"
                      />
                      {selectedFile && (
                        <button
                          onClick={handleFileUpload}
                          disabled={isUploading}
                          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                        >
                          {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                          {isUploading ? `Enviando (${uploadProgress}%)` : 'Começar Upload'}
                        </button>
                      )}
                      {isUploading && (
                        <div className="w-full bg-slate-900 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-700 my-6 pt-6"></div>

                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">URL Direta do Vídeo (.mp4)</label>
                  <div className="relative mb-6">
                    <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://exemplo.com/video.mp4"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nova Senha Admin</label>
                  <div className="relative mb-6">
                    <Unlock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nova senha"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <button
                    onClick={saveConfig}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Save size={20} /> Guardar Alterações
                  </button>
                  {status && <p className="mt-3 text-center text-sm text-green-400">{typeof status === 'string' ? status : ''}</p>}
                </div>
              </div>

              <div className={`${showGuide ? 'block' : 'hidden md:block'} space-y-4`}>
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-dashed border-slate-700 text-sm">
                  <h3 className="text-blue-400 font-bold mb-4 flex items-center gap-2">
                    <QrCode size={18} /> Guia de Uso
                  </h3>
                  <p className="mb-2 text-slate-300"><strong>Hospedagem:</strong> Use o botão de upload acima para subir vídeos diretamente para o seu Firebase Storage.</p>
                  <p className="mb-2 text-slate-300"><strong>Configuração:</strong> Ative o login anônimo e as regras de Storage/Firestore no Firebase Console.</p>
                  <p className="text-slate-300 italic">Após o upload, não esqueça de clicar em "Guardar Alterações" para salvar o link permanentemente.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // UI DO PLAYER
  return (
    <div ref={containerRef} className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden relative font-sans">
      {!auth && (
        <div className="absolute top-4 left-4 z-[100] bg-red-500/20 text-red-400 p-4 rounded-xl border border-red-500/30 text-xs">
          Erro: Firebase não configurado corretamente. Verifique as credenciais no Console do Firebase.
        </div>
      )}
      {!videoConfig.url ? (
        <div className="text-center p-10">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Aguardando configuração do vídeo...</p>
          <button onClick={() => setView('admin')} className="mt-4 text-xs text-slate-700 hover:text-slate-500 underline uppercase">Acesso Admin</button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={videoConfig.url}
            className="w-full h-full object-contain md:object-cover"
            playsInline
            loop
            onClick={handleStartVideo}
          />
          <div
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50 transition-opacity duration-700 cursor-pointer"
            onClick={(e) => {
              handleStartVideo();
              e.currentTarget.style.opacity = '0';
              setTimeout(() => e.currentTarget.style.display = 'none', 700);
            }}
          >
            <div className="bg-white/10 backdrop-blur-xl p-10 rounded-full border border-white/20 hover:scale-105 transition-transform active:scale-95 shadow-2xl">
              <Play fill="white" size={48} className="text-white ml-1" />
            </div>
            <p className="text-white mt-8 font-bold text-lg tracking-widest uppercase animate-pulse">Assistir Vídeo</p>
            <p className="text-slate-400 text-xs mt-2 italic text-center px-6">Toque para ver em tela cheia imersiva</p>
          </div>

          <div className="absolute bottom-6 right-6 flex gap-3 z-40 opacity-20 hover:opacity-100 transition-opacity">
            <button onClick={toggleFullScreen} className="bg-black/60 backdrop-blur-md p-3 rounded-full border border-white/10 text-white hover:bg-white/20"><Maximize size={20} /></button>
            <button onClick={() => { setIsAuthorized(false); setView('admin'); }} className="bg-black/60 backdrop-blur-md p-3 rounded-full border border-white/10 text-white hover:bg-white/20"><Settings size={20} /></button>
          </div>
        </>
      )}
    </div>
  );
}
