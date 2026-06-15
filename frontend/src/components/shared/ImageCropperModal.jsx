import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import Modal from './Modal';
import { getCroppedImg } from '../../utils/cropImage';
import { Loader2, Crop } from 'lucide-react';

const ImageCropperModal = ({ isOpen, onClose, imageSrc, onCropComplete }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      setIsProcessing(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      // Create a file from blob
      const croppedFile = new File([croppedBlob], "cropped-image.jpg", { type: "image/jpeg" });
      onCropComplete(croppedFile);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crop Profile Picture" maxWidth="max-w-xl">
      <div className="relative w-full h-[400px] bg-black/5 rounded-xl overflow-hidden mb-6">
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
          />
        )}
      </div>
      
      <div className="mb-6 px-4">
        <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Zoom</label>
        <input
          type="range"
          value={zoom}
          min={1}
          max={3}
          step={0.1}
          aria-labelledby="Zoom"
          onChange={(e) => setZoom(e.target.value)}
          className="w-full accent-[var(--accent)]"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
        <button
          onClick={onClose}
          className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isProcessing}
          className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest bg-[var(--accent)] text-white rounded-xl hover:opacity-90 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Crop size={14} />}
          Crop & Save
        </button>
      </div>
    </Modal>
  );
};

export default ImageCropperModal;
