import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { TransformationHistoryItem } from './types';
import { editImage } from './services/geminiService';

// --- Helper & UI Components (defined outside App to prevent re-creation on re-renders) ---

const UploadIcon: React.FC = () => (
  <svg className="w-10 h-10 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
  </svg>
);

const DownloadIcon: React.FC = () => (
  <svg className="w-5 h-5 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
    <path d="M14.707 7.793a1 1 0 0 0-1.414 0L11 10.086V1.5a1 1 0 0 0-2 0v8.586L6.707 7.793a1 1 0 1 0-1.414 1.414l4 4a1 1 0 0 0 1.416 0l4-4a1 1 0 0 0-.002-1.414Z"/>
    <path d="M18 12h-2.55l-2.975 2.975a3.5 3.5 0 0 1-4.95 0L4.55 12H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Z"/>
  </svg>
);


const Spinner: React.FC = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

interface ImageResultCardProps {
  title: string;
  imageDataUrl: string | null;
  isLoading: boolean;
  onDownload: () => void;
}

const ImageResultCard: React.FC<ImageResultCardProps> = ({ title, imageDataUrl, isLoading, onDownload }) => (
  <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">
    <div className="p-4 border-b border-gray-700">
      <h3 className="text-lg font-semibold text-white text-center">{title}</h3>
    </div>
    <div className="aspect-square w-full bg-gray-900 flex items-center justify-center flex-grow">
      {isLoading ? (
        <div className="flex flex-col items-center text-gray-400">
          <Spinner />
          <p className="mt-3 text-sm">AI 正在穿越時空...</p>
        </div>
      ) : imageDataUrl ? (
        <img src={imageDataUrl} alt={title} className="w-full h-full object-contain" />
      ) : (
        <div className="text-center text-gray-500 p-4">
          <p>請先上傳圖片並開始變換</p>
        </div>
      )}
    </div>
    {imageDataUrl && (
      <div className="p-3 bg-gray-800/50 border-t border-gray-700">
        <button
          onClick={onDownload}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200"
        >
          <DownloadIcon />
          下載圖片
        </button>
      </div>
    )}
  </div>
);


// --- Main App Component ---

export default function App() {
  const [originalImage, setOriginalImage] = useState<{ dataUrl: string; file: File } | null>(null);
  const [elderlyImage, setElderlyImage] = useState<string | null>(null);
  const [middleAgedImage, setMiddleAgedImage] = useState<string | null>(null);
  const [childImage, setChildImage] = useState<string | null>(null);
  
  const [isLoadingElderly, setIsLoadingElderly] = useState(false);
  const [isLoadingMiddleAged, setIsLoadingMiddleAged] = useState(false);
  const [isLoadingChild, setIsLoadingChild] = useState(false);

  const [history, setHistory] = useState<TransformationHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = isLoadingElderly || isLoadingMiddleAged || isLoadingChild;

  useEffect(() => {
    if (originalImage && elderlyImage && middleAgedImage && childImage) {
      const isAlreadySaved = history.some(item => item.original === originalImage.dataUrl);
      if (!isAlreadySaved) {
        const newHistoryItem: TransformationHistoryItem = {
          id: `hist-${Date.now()}`,
          original: originalImage.dataUrl,
          elderly: elderlyImage,
          middleAged: middleAgedImage,
          child: childImage,
        };
        setHistory(prevHistory => [newHistoryItem, ...prevHistory]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderlyImage, middleAgedImage, childImage]); 

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage({ dataUrl: reader.result as string, file });
        // Reset previous results
        setElderlyImage(null);
        setMiddleAgedImage(null);
        setChildImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    } else {
        setError("請選擇有效的圖片檔案 (PNG, JPG, WEBP)。");
    }
  };

  const handleTransform = useCallback(async () => {
    if (!originalImage) {
      setError("請先上傳一張圖片。");
      return;
    }
    setError(null);
    setIsLoadingElderly(true);
    setIsLoadingMiddleAged(true);
    setIsLoadingChild(true);

    const basePrompt = "Photorealistic edit: Transform the person in this photo to appear as if they are a specific age. Alter their facial features (wrinkles, skin texture), hair, and overall appearance to realistically reflect this age, while maintaining their core identity and the original background.";

    const elderlyPrompt = `${basePrompt} The target age is 90 years old. Also, adjust their clothing to be something modest and comfortable, like a sweater or a collared shirt, suitable for a 90-year-old. Also, adjust their body shape to reflect this age, perhaps making them appear slightly thinner and with a posture befitting an elderly person.`;
    const middleAgedPrompt = `${basePrompt} The target age is 45 years old. Also, adjust their clothing to be something mature and simple, like a business casual shirt or a blouse, suitable for a 45-year-old. Also, adjust their body shape to what might be typical for a 45-year-old, which could be slightly fuller.`;
    const childPrompt = `${basePrompt} The target age is 9 years old. Also, adjust their clothing to be something age-appropriate and fun, like a playful t-shirt or a casual dress, suitable for a 9-year-old. Most importantly, transform their body shape, height, and proportions to that of a 9-year-old child.`;

    try {
      const [elderlyResult, middleAgedResult, childResult] = await Promise.allSettled([
        editImage(originalImage.dataUrl, elderlyPrompt),
        editImage(originalImage.dataUrl, middleAgedPrompt),
        editImage(originalImage.dataUrl, childPrompt),
      ]);

      let errors: string[] = [];

      if (elderlyResult.status === 'fulfilled') {
        setElderlyImage(elderlyResult.value);
      } else {
        errors.push(`90歲樣貌生成失敗: ${elderlyResult.reason instanceof Error ? elderlyResult.reason.message : String(elderlyResult.reason)}`);
      }

      if (middleAgedResult.status === 'fulfilled') {
        setMiddleAgedImage(middleAgedResult.value);
      } else {
        errors.push(`45歲樣貌生成失敗: ${middleAgedResult.reason instanceof Error ? middleAgedResult.reason.message : String(middleAgedResult.reason)}`);
      }

      if (childResult.status === 'fulfilled') {
        setChildImage(childResult.value);
      } else {
          errors.push(`9歲樣貌生成失敗: ${childResult.reason instanceof Error ? childResult.reason.message : String(childResult.reason)}`);
      }
      
      if (errors.length > 0) {
        setError(errors.join('\n'));
      }

    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoadingElderly(false);
      setIsLoadingMiddleAged(false);
      setIsLoadingChild(false);
    }
  }, [originalImage]);

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleHistoryClick = (item: TransformationHistoryItem) => {
    const mockFile = new File([], "history_image.png", { type: "image/png" });
    setOriginalImage({ dataUrl: item.original, file: mockFile });
    setElderlyImage(item.elderly);
    setMiddleAgedImage(item.middleAged);
    setChildImage(item.child);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
            AI 年齡變換器
          </h1>
          <p className="mt-2 text-lg text-gray-400">一鍵穿越時空，看見不同年齡的自己</p>
        </header>
        
        {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-6 whitespace-pre-wrap" role="alert">
                <strong className="font-bold">錯誤：</strong>
                <span className="block sm:inline ml-2">{error}</span>
            </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Control Panel */}
          <div className="xl:col-span-1 bg-gray-800/50 rounded-2xl shadow-lg p-6 flex flex-col space-y-6 self-start">
            <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-3">1. 上傳照片</h2>
            <div 
                className="flex items-center justify-center w-full"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    if(e.dataTransfer.files) {
                        fileInputRef.current!.files = e.dataTransfer.files;
                        handleFileChange({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>);
                    }
                }}
            >
              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadIcon />
                  <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">點擊上傳</span> 或拖曳照片至此</p>
                  <p className="text-xs text-gray-500">JPG, PNG, or WEBP</p>
                </div>
                <input id="dropzone-file" type="file" ref={fileInputRef} className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} />
              </label>
            </div>
            {originalImage && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">預覽</h3>
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-gray-900">
                    <img src={originalImage.dataUrl} alt="Original preview" className="w-full h-full object-contain" />
                </div>
              </div>
            )}
             <div>
              <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-3 mb-4">2. 開始變換</h2>
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={handleTransform}
                  disabled={!originalImage || isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-lg flex items-center justify-center transition-all duration-200 text-xl shadow-lg"
                >
                  {isLoading ? <Spinner /> : "一鍵生成年齡樣貌"}
                </button>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ImageResultCard 
              title="90歲 老年樣貌" 
              imageDataUrl={elderlyImage}
              isLoading={isLoadingElderly}
              onDownload={() => downloadImage(elderlyImage!, `${originalImage?.file.name.split('.')[0]}_90_years.png`)}
            />
            <ImageResultCard 
              title="45歲 中年樣貌" 
              imageDataUrl={middleAgedImage}
              isLoading={isLoadingMiddleAged}
              onDownload={() => downloadImage(middleAgedImage!, `${originalImage?.file.name.split('.')[0]}_45_years.png`)}
            />
            <ImageResultCard 
              title="9歲 兒童樣貌" 
              imageDataUrl={childImage}
              isLoading={isLoadingChild}
              onDownload={() => downloadImage(childImage!, `${originalImage?.file.name.split('.')[0]}_9_years.png`)}
            />
          </div>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold text-white text-center mb-6">歷史紀錄</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {history.map((item) => (
                <div key={item.id} onClick={() => handleHistoryClick(item)} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 hover:shadow-indigo-500/30">
                  <div className="grid grid-cols-4">
                    <img src={item.original} alt="Original" className="w-full h-24 object-cover" />
                    <img src={item.elderly} alt="Elderly" className="w-full h-24 object-cover" />
                    <img src={item.middleAged} alt="Middle-Aged" className="w-full h-24 object-cover" />
                    <img src={item.child} alt="Child" className="w-full h-24 object-cover" />
                  </div>
                  <p className="text-center text-xs py-2 text-gray-400">點擊以載入</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
