import React, { useEffect } from 'react';

interface ScreenViewerProps {
  stream: MediaStream;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const ScreenViewer: React.FC<ScreenViewerProps> = ({ stream, videoRef }) => {
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.error("Video play failed:", err));
    }
  }, [stream, videoRef]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <video 
        ref={videoRef}
        className="max-w-full max-h-full object-contain"
        muted
        playsInline
        autoPlay
      />
    </div>
  );
};