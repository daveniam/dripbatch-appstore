import { useEffect, useRef, useState } from 'react';
import { authHeaders } from '../store';

const THUMB_SIZE = 200;

function resizeToBase64(img, quality = 0.75) {
  const canvas = document.createElement('canvas');
  canvas.width = THUMB_SIZE;
  canvas.height = THUMB_SIZE;
  const ctx = canvas.getContext('2d');
  const ratio = Math.min(img.width / THUMB_SIZE, img.height / THUMB_SIZE);
  const sw = THUMB_SIZE * ratio;
  const sh = THUMB_SIZE * ratio;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, THUMB_SIZE, THUMB_SIZE);
  return canvas.toDataURL('image/jpeg', quality);
}

async function subirFoto(base64) {
  const fotoId = `foto_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const res = await fetch('/api/foto', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ fotoId, base64 }),
  });
  if (!res.ok) throw new Error('Error al subir la foto');
  const data = await res.json();
  return data.url; // '/api/foto/foto_...'
}

export default function CamaraModal({ onCaptura, onCerrar }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const fileInputRef = useRef(null);

  const [fase, setFase]           = useState('camara'); // 'camara' | 'preview' | 'subiendo' | 'error'
  const [preview, setPreview]     = useState(null);     // base64 para mostrar preview
  const [errorMsg, setErrorMsg]   = useState('');
  const [camaraActiva, setCamaraActiva] = useState(false);

  useEffect(() => {
    iniciarCamara();
    return () => detenerStream();
  }, []);

  async function iniciarCamara() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCamaraActiva(true);
      setFase('camara');
    } catch (err) {
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Podés subir una imagen desde tu dispositivo.'
          : `No se pudo acceder a la cámara: ${err.message}`
      );
      setFase('error');
    }
  }

  function detenerStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCamaraActiva(false);
  }

  function capturar() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = THUMB_SIZE;
    canvas.height = THUMB_SIZE;
    const ctx = canvas.getContext('2d');
    const ratio = Math.min(video.videoWidth / THUMB_SIZE, video.videoHeight / THUMB_SIZE);
    const sw = THUMB_SIZE * ratio;
    const sh = THUMB_SIZE * ratio;
    const sx = (video.videoWidth - sw) / 2;
    const sy = (video.videoHeight - sh) / 2;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, THUMB_SIZE, THUMB_SIZE);
    const base64 = canvas.toDataURL('image/jpeg', 0.75);
    detenerStream();
    setPreview(base64);
    setFase('preview');
  }

  function reintentar() {
    setPreview(null);
    setFase('camara');
    iniciarCamara();
  }

  async function confirmar() {
    setFase('subiendo');
    try {
      const url = await subirFoto(preview);
      onCaptura(url); // Devuelve la URL '/api/foto/...' en vez de base64
    } catch (err) {
      setErrorMsg('No se pudo guardar la foto: ' + err.message);
      setFase('error');
    }
  }

  function handleArchivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const base64 = resizeToBase64(img);
        detenerStream();
        setPreview(base64);
        setFase('preview');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[90vh] my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">Foto de la prenda</h3>
          <button
            onClick={() => { detenerStream(); onCerrar(); }}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Vista cámara */}
          {fase === 'camara' && (
            <>
              <div className="relative bg-black rounded-xl overflow-hidden aspect-square">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                {!camaraActiva && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                    Iniciando cámara...
                  </div>
                )}
              </div>
              <button
                onClick={capturar}
                disabled={!camaraActiva}
                className="w-full bg-teal-600 text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                📷 Capturar
              </button>
            </>
          )}

          {/* Vista preview */}
          {fase === 'preview' && (
            <>
              <div className="flex justify-center">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-48 h-48 object-cover rounded-xl border-2 border-teal-200 shadow"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmar}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700"
                >
                  ✓ Usar esta
                </button>
                <button
                  onClick={reintentar}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200"
                >
                  ↺ Reintentar
                </button>
              </div>
            </>
          )}

          {/* Subiendo al servidor */}
          {fase === 'subiendo' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Guardando foto...</p>
            </div>
          )}

          {/* Error */}
          {fase === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 text-center">
              {errorMsg}
            </div>
          )}

          {/* Divider + subir archivo (disponible en camara y error) */}
          {(fase === 'camara' || fase === 'error') && (
            <>
              <div className="flex items-center gap-3 text-gray-300">
                <hr className="flex-1" />
                <span className="text-xs text-gray-400">o</span>
                <hr className="flex-1" />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                📁 Subir imagen desde dispositivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleArchivo}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
