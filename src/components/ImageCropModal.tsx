import React, { useState, useRef } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import Modal from '@/components/Modal';

interface ImageCropModalProps {
  imageSrc: string;
  onClose: () => void;
  onSave: (croppedImage: string) => void;
  onPreview?: (croppedImage: string) => void;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({ imageSrc, onClose, onSave, onPreview }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        1, // aspect ratio 1:1
        width,
        height
      ),
      width,
      height
    );
    setCrop(initialCrop);
  }

  const handleSave = () => {
    if (completedCrop?.width && completedCrop?.height && imgRef.current) {
        const canvas = document.createElement('canvas');
        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const cropX = completedCrop.x * scaleX;
        const cropY = completedCrop.y * scaleY;
        const cropWidth = completedCrop.width * scaleX;
        const cropHeight = completedCrop.height * scaleY;

        ctx.drawImage(
            imgRef.current,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            completedCrop.width,
            completedCrop.height
        );
        
        const base64Image = canvas.toDataURL('image/jpeg');
        onSave(base64Image);
    }
  };

  const handleComplete = (c: Crop) => {
    setCompletedCrop(c);
    if (!onPreview) return;
    if (!c?.width || !c?.height || !imgRef.current) return;
    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    canvas.width = c.width;
    canvas.height = c.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cropX = c.x * scaleX;
    const cropY = c.y * scaleY;
    const cropWidth = c.width * scaleX;
    const cropHeight = c.height * scaleY;
    ctx.drawImage(
      imgRef.current,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      c.width,
      c.height
    );
    const base64Image = canvas.toDataURL('image/jpeg');
    onPreview(base64Image);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Enquadrar Foto de Perfil"
      footer={
        <>
          <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
          <button onClick={handleSave} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Salvar</button>
        </>
      }
    >
        <div className="flex justify-center bg-black/50 p-4 rounded-lg">
            <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={handleComplete}
                aspect={1}
                circularCrop
            >
                <img
                    ref={imgRef}
                    src={imageSrc}
                    onLoad={onImageLoad}
                    alt="Imagem para cortar"
                    style={{ maxHeight: '70vh' }}
                />
            </ReactCrop>
        </div>
    </Modal>
  );
};

export default ImageCropModal;