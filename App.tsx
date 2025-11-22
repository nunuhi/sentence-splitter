
import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import UploadArea from './components/UploadArea';
import SegmentCard from './components/SegmentCard';
import { fileToBase64, fileToAudioBuffer, sliceAudioBuffer, audioBufferToWav, audioBufferToMp3 } from './utils/audioUtils';
import { analyzeAudioSegments } from './services/geminiService';
import { AppStatus, ProcessedSegment } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [processedSegments, setProcessedSegments] = useState<ProcessedSegment[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipType, setZipType] = useState<'wav' | 'mp3' | null>(null);
  
  // We need to keep track of the original audio buffer to slice it later
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleFileSelect = async (file: File) => {
    try {
      setOriginalFile(file);
      setErrorMsg(null);
      setProcessedSegments([]);
      setStatus(AppStatus.UPLOADING);

      // 1. Initialize AudioContext
      const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new CtxClass();
      }
      const ctx = audioContextRef.current;

      // 2. Decode Audio File
      setStatus(AppStatus.ANALYZING);
      const buffer = await fileToAudioBuffer(file, ctx);
      audioBufferRef.current = buffer;

      // 3. Convert to Base64 for Gemini
      const base64 = await fileToBase64(file);

      // 4. Send to Gemini to get timestamps
      const rawSegments = await analyzeAudioSegments(base64, file.type);
      
      // 5. Slice Audio based on timestamps
      setStatus(AppStatus.PROCESSING);
      
      const results: ProcessedSegment[] = [];
      
      for (let i = 0; i < rawSegments.length; i++) {
        const seg = rawSegments[i];
        
        // Slice the buffer
        const slicedBuffer = sliceAudioBuffer(
          buffer, 
          seg.start, 
          seg.end, 
          ctx
        );
        
        // Convert slice to WAV Blob (default for immediate playback)
        const wavBlob = audioBufferToWav(slicedBuffer);
        const blobUrl = URL.createObjectURL(wavBlob);
        
        results.push({
          ...seg,
          id: `seg-${i}-${Date.now()}`,
          blob: wavBlob,
          url: blobUrl,
          duration: seg.end - seg.start,
          audioBuffer: slicedBuffer
        });
      }

      setProcessedSegments(results);
      setStatus(AppStatus.READY);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleReset = () => {
    setOriginalFile(null);
    setProcessedSegments([]);
    setStatus(AppStatus.IDLE);
    setErrorMsg(null);
    audioBufferRef.current = null;
    setZipType(null);
  };

  const handleDownloadAll = async (format: 'wav' | 'mp3') => {
    if (processedSegments.length === 0) return;
    
    setIsZipping(true);
    setZipType(format);
    
    // Use setTimeout to push the heavy lifting to the end of the event queue
    // to ensure the UI updates (spinner shows up) before we start freezing things.
    setTimeout(async () => {
      try {
        const zip = new JSZip();
        let hasError = false;
        
        // Iterate with slight async delay to prevent UI freeze for large number of files
        for (let index = 0; index < processedSegments.length; index++) {
          const segment = processedSegments[index];
          let blob = segment.blob;
          let extension = 'wav';
          
          if (format === 'mp3') {
             // Allow UI to breathe between heavy encodings
             await new Promise(resolve => setTimeout(resolve, 10));
             
             try {
               // Convert to MP3 on demand
               blob = audioBufferToMp3(segment.audioBuffer);
               extension = 'mp3';
             } catch (e) {
               console.error(`Error converting segment ${index} to MP3`, e);
               hasError = true;
               // In case of error, we stop to prevent giving users wrong file formats
               // or we could skip. Here we will stop and alert.
               throw new Error(`Failed to convert segment ${index + 1} to MP3.`);
             }
          }

          const filename = `sentence-${index + 1}.${extension}`;
          zip.file(filename, blob);
        }

        if (!hasError) {
          // Generate the zip file
          const content = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(content);
          
          // Trigger download
          const a = document.createElement('a');
          a.href = url;
          const originalName = originalFile?.name.replace(/\.[^/.]+$/, "") || "audio";
          a.download = `${originalName}-sentences-${format}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (error: any) {
        console.error("Failed to zip files", error);
        alert(`Failed to create ${format.toUpperCase()} zip file. Error: ${error.message}`);
      } finally {
        setIsZipping(false);
        setZipType(null);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl mb-4">
            Sentence<span className="text-indigo-600">Splitter</span> AI
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Upload your English audio recording. We'll use Gemini AI to identify exact sentence boundaries and split them into downloadable audio clips.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          
          {/* Upload Section - Hide if we have results, show if IDLE or ERROR */}
          {(status === AppStatus.IDLE || status === AppStatus.ERROR) && (
            <div className="bg-white shadow-xl rounded-3xl p-8 border border-slate-100">
              <UploadArea onFileSelect={handleFileSelect} disabled={false} />
              {status === AppStatus.ERROR && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-center border border-red-100">
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{errorMsg}</p>
                  <button 
                     onClick={() => setStatus(AppStatus.IDLE)}
                     className="mt-2 text-sm underline hover:text-red-900"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loading States */}
          {(status === AppStatus.UPLOADING || status === AppStatus.ANALYZING || status === AppStatus.PROCESSING) && (
            <div className="bg-white shadow-xl rounded-3xl p-12 border border-slate-100 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {status === AppStatus.UPLOADING && "Reading audio file..."}
                {status === AppStatus.ANALYZING && "Analyzing with Gemini AI..."}
                {status === AppStatus.PROCESSING && "Slicing audio segments..."}
              </h3>
              <p className="text-slate-500">This might take a moment depending on the file size.</p>
            </div>
          )}

          {/* Results Section */}
          {status === AppStatus.READY && (
            <div className="animate-fade-in">
              <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Extracted Sentences</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Found {processedSegments.length} sentences from {originalFile?.name}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-3 items-center justify-end">
                   <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm p-1">
                    <button
                      onClick={() => handleDownloadAll('wav')}
                      disabled={isZipping}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 
                        ${isZipping && zipType === 'wav' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}
                      `}
                    >
                      {isZipping && zipType === 'wav' ? (
                        <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-600">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l3.32-3.32m0 0-3.32-3.32M12 6v10.5" />
                        </svg>
                      )}
                       Batch WAV
                    </button>
                  </div>

                  <button 
                    onClick={handleReset}
                    className="text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors px-4 py-2 rounded-lg shadow-sm"
                  >
                    Start Over
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {processedSegments.map((segment, idx) => (
                  <SegmentCard key={segment.id} segment={segment} index={idx} />
                ))}
              </div>
              
              {processedSegments.length === 0 && (
                 <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
                   <p>No distinct sentences found. Try a clearer recording.</p>
                 </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-slate-400 text-sm">
          <p>Powered by Google Gemini 2.5 Flash & Web Audio API</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
