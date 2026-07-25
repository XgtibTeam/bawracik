'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  onCapture: (dataUrl: string | null) => void;
};

export default function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCameraOn(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOn(true);
    } catch (err) {
      setError('Tidak bisa mengakses kamera. Pastikan izin kamera sudah diberikan.');
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror agar sesuai dengan tampilan preview (selfie-style)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhoto(dataUrl);
    onCapture(dataUrl);
    stopCamera();
  };

  const retake = () => {
    setPhoto(null);
    onCapture(null);
    startCamera();
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-ink/90">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Hasil swafoto" className="h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            className="h-full w-full object-cover [transform:scaleX(-1)]"
            playsInline
            muted
          />
        )}
        {!isCameraOn && !photo && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
            Kamera belum aktif
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        {!isCameraOn && !photo && (
          <button
            type="button"
            onClick={startCamera}
            className="flex-1 rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Buka Kamera
          </button>
        )}
        {isCameraOn && !photo && (
          <button
            type="button"
            onClick={takePhoto}
            className="flex-1 rounded-card bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Jepret Foto
          </button>
        )}
        {photo && (
          <button
            type="button"
            onClick={retake}
            className="flex-1 rounded-card border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5"
          >
            Ambil Ulang
          </button>
        )}
      </div>
    </div>
  );
}
