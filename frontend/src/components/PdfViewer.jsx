import React, { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

// Individual page renderer
const PdfPage = ({ pdf, pageNum, containerWidth }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState(null);  
  const renderTaskRef = useRef(null);

  useEffect(() => {
    let active = true;

    const renderPage = async () => {
      try {
        setLoading(true);
        setRenderError(null);

        const page = await pdf.getPage(pageNum);
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Cancel any ongoing rendering tasks
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const context = canvas.getContext("2d");
        const viewport = page.getViewport({ scale: 1.0 });

        // Calculate target display width (fit to parent container minus padding)
        // Fall back to 350px if containerWidth is 0 (prevents initial rendering block)
        const padding = 16; 
        const targetWidth = Math.max(150, (containerWidth || 350) - padding);
        
        // Scale factor relative to native viewport
        const displayScale = targetWidth / viewport.width;

        // To make text crisp on high-DPI displays, render at 2x of target scale
        const renderScale = displayScale * 2;
        const scaledViewport = page.getViewport({ scale: renderScale });

        // Set canvas internal drawing dimensions (high-res)
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // Set CSS styles to scale down the canvas (rendering responsive size)
        canvas.style.width = `${targetWidth}px`;
        canvas.style.height = `${(viewport.height / viewport.width) * targetWidth}px`;

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (active) {
          setLoading(false);
        }
      } catch (err) {
        if (err.name !== "RenderingCancelledException") {
          console.error(`Error rendering page ${pageNum}:`, err);
          if (active) {
            setRenderError(err.message || "Failed to render page.");
            setLoading(false);
          }
        }
      }
    };

      renderPage();

    return () => {
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdf, pageNum, containerWidth]);

  return (
    <div className="relative bg-white rounded-lg shadow-md border border-slate-200 dark:border-slate-800/40 overflow-hidden shrink-0 transition-transform duration-200">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/70 dark:bg-slate-900/60 z-10">
          <Loader2 className="animate-spin text-primary-500" size={20} />
        </div>
      )}
      {renderError ? (
        <div className="flex flex-col items-center justify-center p-6 text-center gap-1.5 text-red-500 w-[300px] h-[150px] bg-slate-50 dark:bg-slate-900">
          <AlertCircle size={20} />
          <span className="text-[10px] font-extrabold uppercase">Page Render Error</span>
        </div>
      ) : (
      <canvas ref={canvasRef} className="block shadow-inner" />
      )}
    </div>
  );
};

const PdfViewer = ({ url }) => {
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // ResizeObserver to track target element width responsively
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        updateWidth();
      });
    });

    resizeObserver.observe(containerRef.current);
    window.addEventListener("resize", updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  // Fetch/Parse PDF Document using PDF.js via CDN
  useEffect(() => {
    let active = true;

    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!window.pdfjsLib) {
          // Dynamically load PDF.js script if not available globally
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error("Failed to load PDF script."));
            document.head.appendChild(script);
          });
        }

        const pdfjsLib = window.pdfjsLib;

        // Bypass CORS Same-Origin Policy for cross-origin Worker using inline Blob importScripts
        const workerUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        try {
          const blob = new Blob([`importScripts("${workerUrl}");`], { type: "application/javascript" });
          pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        } catch (workerErr) {
          console.warn("Worker Blob wrapper creation failed. Falling back to direct URL.", workerErr);
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        }

        const loadingTask = pdfjsLib.getDocument(url);
        const loadedPdf = await loadingTask.promise;

        if (active) {
          setPdf(loadedPdf);
          setNumPages(loadedPdf.numPages);
          setLoading(false);
        }
      } catch (err) {
        console.error("PDF.js load failure:", err);
        if (active) {
          setError(err.message || "Failed to load document preview.");
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      active = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 w-full h-full gap-2 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 min-h-[300px]">
        <Loader2 className="animate-spin text-primary-500" size={28} />
        <span className="text-xs font-semibold">Compiling inline preview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center gap-2 text-red-500 bg-slate-100 dark:bg-slate-955 w-full h-full min-h-[300px]">
        <AlertCircle size={24} />
        <span className="text-xs font-extrabold uppercase tracking-wider">Preview Failed</span>
        <p className="text-xs max-w-[240px] text-slate-500 dark:text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto px-2 py-4 bg-slate-100 dark:bg-slate-955 flex flex-col items-center gap-4 scroll-smooth"
    >
      {Array.from({ length: numPages }, (_, i) => (
        <PdfPage
          key={i + 1}
          pdf={pdf}
          pageNum={i + 1}
          containerWidth={containerWidth}
        />
      ))}
    </div>
  );
};

export default PdfViewer;