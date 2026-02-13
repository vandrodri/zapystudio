
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SocialPreset, PRESETS, Layer, FONTS } from '../types';

declare const piexif: any;

interface EditorState {
  preset: SocialPreset;
  layers: Layer[];
  borderWidth: number;
  borderColor: string;
  vibrance: number;
  brightness: number;
  contrast: number;
  sharpen: number;
}

const Editor: React.FC = () => {
  const [preset, setPreset] = useState<SocialPreset>(SocialPreset.INSTAGRAM_SQUARE);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [borderWidth, setBorderWidth] = useState(0);
  const [borderColor, setBorderColor] = useState('#ffffff');
  const [vibrance, setVibrance] = useState(1.2);
  const [brightness, setBrightness] = useState(105);
  const [contrast, setContrast] = useState(110);
  const [sharpen, setSharpen] = useState(0);
  
  // Opção de Proporção
  const [isProportional, setIsProportional] = useState(true);

  // Histórico Undo/Redo
  const [history, setHistory] = useState<EditorState[]>([]);
  const [future, setFuture] = useState<EditorState[]>([]);

  // Interatividade
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState<string | null>(null);
  
  // Crop State
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 }); // 0 to 1 relative
  const [isResizingCrop, setIsResizingCrop] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const activeLayer = layers.find(l => l.id === activeLayerId);

  // Helper para salvar o estado atual no histórico
  const pushToHistory = useCallback(() => {
    const currentState: EditorState = {
      preset,
      layers: JSON.parse(JSON.stringify(layers)), // Deep clone layers
      borderWidth,
      borderColor,
      vibrance,
      brightness,
      contrast,
      sharpen
    };
    setHistory(prev => [...prev.slice(-49), currentState]);
    setFuture([]); // Limpa o futuro ao realizar nova ação
  }, [preset, layers, borderWidth, borderColor, vibrance, brightness, contrast, sharpen]);

  const undo = () => {
    if (history.length === 0) return;
    
    const currentState: EditorState = {
      preset,
      layers: JSON.parse(JSON.stringify(layers)),
      borderWidth,
      borderColor,
      vibrance,
      brightness,
      contrast,
      sharpen
    };
    
    const prevState = history[history.length - 1];
    setFuture(prev => [currentState, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    
    // Aplicar estado anterior
    setPreset(prevState.preset);
    setLayers(prevState.layers);
    setBorderWidth(prevState.borderWidth);
    setBorderColor(prevState.borderColor);
    setVibrance(prevState.vibrance);
    setBrightness(prevState.brightness);
    setContrast(prevState.contrast);
    setSharpen(prevState.sharpen);
  };

  const redo = () => {
    if (future.length === 0) return;
    
    const currentState: EditorState = {
      preset,
      layers: JSON.parse(JSON.stringify(layers)),
      borderWidth,
      borderColor,
      vibrance,
      brightness,
      contrast,
      sharpen
    };
    
    const nextState = future[0];
    setHistory(prev => [...prev, currentState]);
    setFuture(prev => prev.slice(1));
    
    // Aplicar próximo estado
    setPreset(nextState.preset);
    setLayers(nextState.layers);
    setBorderWidth(nextState.borderWidth);
    setBorderColor(nextState.borderColor);
    setVibrance(nextState.vibrance);
    setBrightness(nextState.brightness);
    setContrast(nextState.contrast);
    setSharpen(nextState.sharpen);
  };

  const applyMagicFix = () => {
    pushToHistory();
    setBrightness(115);
    setContrast(125);
    setVibrance(1.4);
    setSharpen(25);
  };

  const getPresetLabel = (key: string) => {
    const labels: Record<string, string> = {
      'INSTAGRAM_SQUARE': 'Instagram (Quadrado)',
      'INSTAGRAM_STORY': 'Instagram (Story)',
      'FACEBOOK_POST': 'Facebook (Post)',
      'GBP_PHOTO': 'Perfil de Empresa (Google)',
      'CUSTOM': 'Personalizado'
    };
    return labels[key] || key;
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = PRESETS[preset];
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const sharpenEffect = sharpen > 0 ? `contrast(${100 + (sharpen * 0.5)}%)` : '';
    ctx.filter = `saturate(${vibrance}) contrast(${contrast}%) brightness(${brightness}%) ${sharpenEffect}`;

    layers.forEach(layer => {
      ctx.save();
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);

      let contentW = 0;
      let contentH = 0;

      if (layer.type === 'image' || layer.type === 'logo') {
        const img = new Image();
        img.src = layer.content;
        if (img.complete) {
          contentW = (layer.width || img.width) * (layer.scale || 1);
          contentH = (layer.height || img.height) * (layer.scale || 1);
          ctx.drawImage(img, -contentW / 2, -contentH / 2, contentW, contentH);
          
          if (isCropping && activeLayerId === layer.id) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            const cx = -contentW/2 + cropRect.x * contentW;
            const cy = -contentH/2 + cropRect.y * contentH;
            const cw = cropRect.w * contentW;
            const ch = cropRect.h * contentH;

            ctx.fillRect(-contentW/2, -contentH/2, contentW, cropRect.y * contentH);
            ctx.fillRect(-contentW/2, -contentH/2 + (cropRect.y + cropRect.h) * contentH, contentW, (1 - cropRect.y - cropRect.h) * contentH);
            ctx.fillRect(-contentW/2, cy, cropRect.x * contentW, ch);
            ctx.fillRect(-contentW/2 + (cropRect.x + cropRect.w) * contentW, cy, (1 - cropRect.x - cropRect.w) * contentW, ch);

            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(cx, cy, cw, ch);
            ctx.setLineDash([]);

            ctx.fillStyle = '#3b82f6';
            const handleSize = 10;
            ctx.beginPath(); ctx.arc(cx, cy, handleSize, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + cw, cy, handleSize, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx, cy + ch, handleSize, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + cw, cy + ch, handleSize, 0, Math.PI * 2); ctx.fill();
          }
        } else {
           img.onload = () => drawCanvas();
        }
      } else {
        ctx.font = `${layer.fontSize}px ${layer.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const textMetrics = ctx.measureText(layer.content);
        contentW = textMetrics.width;
        contentH = layer.fontSize || 24;

        if (layer.bgColor && layer.bgColor !== 'transparent') {
          ctx.fillStyle = layer.bgColor;
          const rectX = -contentW / 2 - 15;
          const rectY = -contentH / 2 - 10;
          const rectW = contentW + 30;
          const rectH = contentH + 20;
          const radius = Math.min(rectH / 2, 12);
          
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(rectX, rectY, rectW, rectH, radius);
          } else {
            ctx.rect(rectX, rectY, rectW, rectH);
          }
          ctx.fill();
        }

        if (layer.textBorderWidth && layer.textBorderWidth > 0) {
          ctx.strokeStyle = layer.textBorderColor || '#000000';
          ctx.lineWidth = layer.textBorderWidth;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.strokeText(layer.content, 0, 0);
        }

        ctx.fillStyle = layer.color || '#ffffff';
        ctx.fillText(layer.content, 0, 0);
      }

      // Desenhar Bounding Box de Seleção e Handles de Redimensionamento
      if (activeLayerId === layer.id && !isCropping) {
        const boxW = layer.type === 'text' ? contentW + 30 : contentW;
        const boxH = layer.type === 'text' ? contentH + 20 : contentH;

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
        ctx.setLineDash([]);

        // Handles nos cantos
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        const hs = 12;
        const corners = [
          { x: -boxW / 2, y: -boxH / 2 }, // TL
          { x: boxW / 2, y: -boxH / 2 },  // TR
          { x: -boxW / 2, y: boxH / 2 },  // BL
          { x: boxW / 2, y: boxH / 2 }   // BR
        ];
        corners.forEach(c => {
          ctx.beginPath();
          ctx.arc(c.x, c.y, hs / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }

      ctx.restore();
    });

    ctx.filter = 'none';
    if (borderWidth > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth * 2;
      ctx.strokeRect(0, 0, width, height);
    }
  }, [layers, preset, borderWidth, borderColor, vibrance, brightness, contrast, sharpen, isCropping, cropRect, activeLayerId]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isLogo: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    pushToHistory();

    let targetFile = file;
    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
      if ((window as any).heic2any) {
        try {
          const blob = await (window as any).heic2any({ blob: file, toType: 'image/jpeg' });
          targetFile = new File([blob as Blob], file.name.replace(/\.heic/i, '.jpg'), { type: 'image/jpeg' });
        } catch (err) {
          console.error('Falha na conversão HEIC', err);
        }
      }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      // Extrair EXIF para preservação (Geotags, etc)
      let exifData = "";
      try {
        if (content.startsWith("data:image/jpeg")) {
          exifData = piexif.load(content);
        }
      } catch (e) {
        console.warn("Não foi possível carregar EXIF da imagem", e);
      }
      
      const img = new Image();
      img.onload = () => {
        const canvasDim = PRESETS[preset];
        let initialScale = 0.5;

        if (isLogo) {
          initialScale = (canvasDim.width * 0.25) / img.width;
        } else {
          const scaleW = (canvasDim.width * 0.9) / img.width;
          const scaleH = (canvasDim.height * 0.9) / img.height;
          initialScale = Math.min(scaleW, scaleH);
        }

        const newLayer: Layer = {
          id: Math.random().toString(36).substr(2, 9),
          type: isLogo ? 'logo' : 'image',
          content,
          x: canvasDim.width / 2,
          y: canvasDim.height / 2,
          rotation: 0,
          scale: initialScale,
          width: img.width,
          height: img.height,
          exifData: exifData ? JSON.stringify(exifData) : undefined
        };
        setLayers([...layers, newLayer]);
        setActiveLayerId(newLayer.id);
      };
      img.src = content;
    };
    reader.readAsDataURL(targetFile);
  };

  const addText = () => {
    pushToHistory();
    const newLayer: Layer = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      content: 'Novo Texto',
      x: PRESETS[preset].width / 2,
      y: PRESETS[preset].height / 2,
      rotation: 0,
      fontSize: 80,
      color: '#ffffff',
      bgColor: '#000000',
      fontFamily: 'Montserrat',
      textBorderWidth: 0,
      textBorderColor: '#000000'
    };
    setLayers([...layers, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  const updateLayer = (id: string, updates: Partial<Layer>) => {
    setLayers(layers.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteLayer = (id: string) => {
    pushToHistory();
    setLayers(layers.filter(l => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(null);
  };

  const confirmCrop = () => {
    if (!activeLayer || (activeLayer.type !== 'image' && activeLayer.type !== 'logo')) return;
    
    pushToHistory();

    const img = new Image();
    img.onload = () => {
      const cropCanvas = document.createElement('canvas');
      const sx = cropRect.x * img.width;
      const sy = cropRect.y * img.height;
      const sw = cropRect.w * img.width;
      const sh = cropRect.h * img.height;

      cropCanvas.width = sw;
      cropCanvas.height = sh;
      const cctx = cropCanvas.getContext('2d');
      if (cctx) {
        cctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        let newContent = cropCanvas.toDataURL('image/jpeg', 0.95);
        
        // Reinjetar EXIF no recorte para manter Geotags
        if (activeLayer.exifData) {
          try {
             const exifObj = JSON.parse(activeLayer.exifData);
             const exifStr = piexif.dump(exifObj);
             newContent = piexif.insert(exifStr, newContent);
          } catch (e) {
             console.warn("Falha ao reinjetar EXIF no recorte", e);
          }
        }

        updateLayer(activeLayer.id, { 
          content: newContent, 
          width: sw, 
          height: sh 
        });
      }
      setIsCropping(false);
      setCropRect({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
    };
    img.src = activeLayer.content;
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Exportamos como JPEG para garantir suporte a injeção de EXIF (Geotags)
    let finalDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    
    // Tenta encontrar a primeira camada com EXIF para preservar metadados de localização
    const layerWithExif = layers.find(l => l.exifData);
    if (layerWithExif && layerWithExif.exifData) {
      try {
        const exifObj = JSON.parse(layerWithExif.exifData);
        const exifStr = piexif.dump(exifObj);
        finalDataUrl = piexif.insert(exifStr, finalDataUrl);
      } catch (e) {
        console.warn("Falha ao injetar EXIF na exportação", e);
      }
    }

    const link = document.createElement('a');
    link.download = `insta-vibrante-${Date.now()}.jpg`;
    link.href = finalDataUrl;
    link.click();
  };

  const exportSVG = () => {
    const { width, height } = PRESETS[preset];
    let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svgContent += `<rect width="100%" height="100%" fill="#0f172a" />`;

    layers.forEach(layer => {
      const transform = `translate(${layer.x}, ${layer.y}) rotate(${layer.rotation})`;
      if (layer.type === 'image' || layer.type === 'logo') {
        svgContent += `<g transform="${transform}">`;
        svgContent += `<image href="${layer.content}" x="-${(layer.width || 500) / 2 * (layer.scale || 1)}" y="-${(layer.height || 500) / 2 * (layer.scale || 1)}" width="${(layer.width || 500) * (layer.scale || 1)}" height="${(layer.height || 500) * (layer.scale || 1)}" />`;
        svgContent += `</g>`;
      } else {
        const stroke = layer.textBorderWidth && layer.textBorderWidth > 0 ? `stroke="${layer.textBorderColor}" stroke-width="${layer.textBorderWidth}"` : '';
        svgContent += `<g transform="${transform}">`;
        if (layer.bgColor && layer.bgColor !== 'transparent') {
           svgContent += `<rect x="-100" y="-40" width="200" height="80" fill="${layer.bgColor}" rx="12" ry="12" />`;
        }
        svgContent += `<text x="0" y="0" font-family="${layer.fontFamily}" font-size="${layer.fontSize}" fill="${layer.color}" text-anchor="middle" dominant-baseline="middle" ${stroke}>${layer.content}</text>`;
        svgContent += `</g>`;
      }
    });

    if (borderWidth > 0) {
      svgContent += `<rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="${borderColor}" stroke-width="${borderWidth * 2}" />`;
    }

    svgContent += `</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `insta-vibrante-${Date.now()}.svg`;
    link.href = url;
    link.click();
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (isCropping && activeLayer) {
      const dx = mouseX - activeLayer.x;
      const dy = mouseY - activeLayer.y;
      const angle = -(activeLayer.rotation * Math.PI) / 180;
      const localMouseX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localMouseY = dx * Math.sin(angle) + dy * Math.cos(angle);

      const w = (activeLayer.width || 0) * (activeLayer.scale || 1);
      const h = (activeLayer.height || 0) * (activeLayer.scale || 1);
      
      const lx = -w/2 + cropRect.x * w;
      const ly = -h/2 + cropRect.y * h;
      const lw = cropRect.w * w;
      const lh = cropRect.h * h;

      const handleRadius = 25;
      if (Math.sqrt((localMouseX - lx)**2 + (localMouseY - ly)**2) < handleRadius) {
        setIsResizingCrop('TL');
        pushToHistory();
        return;
      }
      if (Math.sqrt((localMouseX - (lx + lw))**2 + (localMouseY - ly)**2) < handleRadius) {
        setIsResizingCrop('TR');
        pushToHistory();
        return;
      }
      if (Math.sqrt((localMouseX - lx)**2 + (localMouseY - (ly + lh))**2) < handleRadius) {
        setIsResizingCrop('BL');
        pushToHistory();
        return;
      }
      if (Math.sqrt((localMouseX - (lx + lw))**2 + (localMouseY - (ly + lh))**2) < handleRadius) {
        setIsResizingCrop('BR');
        pushToHistory();
        return;
      }
      return;
    }

    // Detecção de clique em handles de redimensionamento da camada ativa
    if (activeLayer) {
      const dx = mouseX - activeLayer.x;
      const dy = mouseY - activeLayer.y;
      const angle = -(activeLayer.rotation * Math.PI) / 180;
      const lx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ly = dx * Math.sin(angle) + dy * Math.cos(angle);

      let w = 0, h = 0;
      if (activeLayer.type === 'image' || activeLayer.type === 'logo') {
        w = (activeLayer.width || 100) * (activeLayer.scale || 1);
        h = (activeLayer.height || 100) * (activeLayer.scale || 1);
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `${activeLayer.fontSize}px ${activeLayer.fontFamily}`;
          w = ctx.measureText(activeLayer.content).width + 30;
          h = (activeLayer.fontSize || 24) + 20;
        }
      }

      const handleHitArea = 25;
      if (Math.abs(lx - (-w/2)) < handleHitArea && Math.abs(ly - (-h/2)) < handleHitArea) { setIsResizing('TL'); pushToHistory(); return; }
      if (Math.abs(lx - (w/2)) < handleHitArea && Math.abs(ly - (-h/2)) < handleHitArea) { setIsResizing('TR'); pushToHistory(); return; }
      if (Math.abs(lx - (-w/2)) < handleHitArea && Math.abs(ly - (h/2)) < handleHitArea) { setIsResizing('BL'); pushToHistory(); return; }
      if (Math.abs(lx - (w/2)) < handleHitArea && Math.abs(ly - (h/2)) < handleHitArea) { setIsResizing('BR'); pushToHistory(); return; }
    }

    // Seleção de camada (hit detection precisa com rotação)
    const hitLayer = [...layers].reverse().find(layer => {
      const dx = mouseX - layer.x;
      const dy = mouseY - layer.y;
      const angle = -(layer.rotation * Math.PI) / 180;
      const lx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ly = dx * Math.sin(angle) + dy * Math.cos(angle);

      let w = 0, h = 0;
      if (layer.type === 'image' || layer.type === 'logo') {
        w = (layer.width || 100) * (layer.scale || 1);
        h = (layer.height || 100) * (layer.scale || 1);
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `${layer.fontSize}px ${layer.fontFamily}`;
          w = ctx.measureText(layer.content).width + 30;
          h = (layer.fontSize || 24) + 20;
        }
      }
      return Math.abs(lx) < w / 2 && Math.abs(ly) < h / 2;
    });

    if (hitLayer) {
      setActiveLayerId(hitLayer.id);
      setIsDragging(true);
      setDragOffset({ x: mouseX - hitLayer.x, y: mouseY - hitLayer.y });
      pushToHistory();
    } else {
      setActiveLayerId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Resizing CROP
    if (isCropping && isResizingCrop && activeLayer) {
      const dx = mouseX - activeLayer.x;
      const dy = mouseY - activeLayer.y;
      const angle = -(activeLayer.rotation * Math.PI) / 180;
      const localMouseX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localMouseY = dx * Math.sin(angle) + dy * Math.cos(angle);

      const w = (activeLayer.width || 0) * (activeLayer.scale || 1);
      const h = (activeLayer.height || 0) * (activeLayer.scale || 1);
      
      const localX = (localMouseX + w/2) / w;
      const localY = (localMouseY + h/2) / h;

      const newRect = { ...cropRect };
      if (isResizingCrop === 'TL') {
        newRect.w += newRect.x - localX;
        newRect.h += newRect.y - localY;
        newRect.x = localX;
        newRect.y = localY;
      } else if (isResizingCrop === 'TR') {
        newRect.w = localX - newRect.x;
        newRect.h += newRect.y - localY;
        newRect.y = localY;
      } else if (isResizingCrop === 'BL') {
        newRect.w += newRect.x - localX;
        newRect.x = localX;
        newRect.h = localY - newRect.y;
      } else if (isResizingCrop === 'BR') {
        newRect.w = localX - newRect.x;
        newRect.h = localY - newRect.y;
      }
      
      newRect.x = Math.max(0, Math.min(1, newRect.x));
      newRect.y = Math.max(0, Math.min(1, newRect.y));
      newRect.w = Math.max(0.1, Math.min(1 - newRect.x, newRect.w));
      newRect.h = Math.max(0.1, Math.min(1 - newRect.y, newRect.h));

      setCropRect(newRect);
      return;
    }

    // Resizing Layer
    if (isResizing && activeLayer) {
      const dx = mouseX - activeLayer.x;
      const dy = mouseY - activeLayer.y;
      const angle = -(activeLayer.rotation * Math.PI) / 180;
      const lx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ly = dx * Math.sin(angle) + dy * Math.cos(angle);

      if (activeLayer.type === 'image' || activeLayer.type === 'logo') {
        const baseW = activeLayer.width || 100;
        const baseH = activeLayer.height || 100;
        
        if (isProportional) {
          // Redimensionamento Proporcional (usa o maior desvio como base)
          const newScale = Math.max(0.05, Math.abs(lx * 2) / baseW);
          updateLayer(activeLayer.id, { scale: newScale });
        } else {
          // Redimensionamento Livre (independente em X e Y)
          const newW = Math.max(10, Math.abs(lx * 2));
          const newH = Math.max(10, Math.abs(ly * 2));
          updateLayer(activeLayer.id, { width: newW, height: newH, scale: 1 });
        }
      } else {
        // Redimensionar texto (fontSize)
        const newFontSize = Math.max(8, Math.abs(ly * 2));
        updateLayer(activeLayer.id, { fontSize: Math.round(newFontSize) });
      }
      return;
    }

    // Dragging Layer
    if (isDragging && activeLayerId) {
      updateLayer(activeLayerId, {
        x: Math.round(mouseX - dragOffset.x),
        y: Math.round(mouseY - dragOffset.y)
      });
      return;
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setIsResizingCrop(null);
    setIsResizing(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      <div className="lg:col-span-4 space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-12">
        {!isCropping ? (
          <>
            {/* Botões Undo/Redo */}
            <section className="p-3 bg-dark-blue-800 rounded-2xl shadow-neu-out flex gap-3">
              <button
                onClick={undo}
                disabled={history.length === 0}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                  history.length === 0 ? 'opacity-30 cursor-not-allowed grayscale' : 'bg-dark-blue-700 hover:bg-dark-blue-600 shadow-neu-sm-out active:shadow-neu-sm-in'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Desfazer
              </button>
              <button
                onClick={redo}
                disabled={future.length === 0}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                  future.length === 0 ? 'opacity-30 cursor-not-allowed grayscale' : 'bg-dark-blue-700 hover:bg-dark-blue-600 shadow-neu-sm-out active:shadow-neu-sm-in'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                </svg>
                Refazer
              </button>
            </section>

            <section className="p-6 bg-dark-blue-800 rounded-3xl shadow-neu-out space-y-4">
              <h2 className="text-xl font-bold text-blue-400">Configuração do Projeto</h2>
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Tamanho Predefinido</label>
                <select
                  value={preset}
                  onChange={(e) => {
                    pushToHistory();
                    setPreset(e.target.value as SocialPreset);
                  }}
                  className="w-full bg-dark-blue-900 border-none rounded-xl p-3 shadow-neu-sm-in outline-none"
                >
                  {Object.keys(PRESETS).map(key => (
                    <option key={key} value={key}>{getPresetLabel(key)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-dark-blue-700 hover:bg-dark-blue-600 p-3 rounded-xl shadow-neu-sm-out text-xs font-semibold transition-all"
                >
                  + Foto
                </button>
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="bg-dark-blue-700 hover:bg-dark-blue-600 p-3 rounded-xl shadow-neu-sm-out text-xs font-semibold transition-all"
                >
                  + Logo
                </button>
                <button
                  onClick={addText}
                  className="col-span-2 bg-blue-600 hover:bg-blue-500 p-3 rounded-xl shadow-neu-sm-out text-sm font-semibold transition-all"
                >
                  + Texto / Título
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.heic" onChange={(e) => handleFileUpload(e, false)} />
                <input type="file" ref={logoInputRef} className="hidden" accept="image/*,.heic" onChange={(e) => handleFileUpload(e, true)} />
              </div>
            </section>

            {activeLayer && (
              <section className="p-6 bg-dark-blue-800 rounded-3xl shadow-neu-out space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-indigo-400">Editar Camada</h2>
                  
                  {/* Botão de Proporção Livre/Travada */}
                  {(activeLayer.type === 'image' || activeLayer.type === 'logo') && (
                    <button
                      onClick={() => setIsProportional(!isProportional)}
                      title={isProportional ? "Proporção Travada" : "Redimensionamento Livre"}
                      className={`p-2 rounded-xl shadow-neu-sm-out transition-all ${
                        isProportional ? 'bg-indigo-600 text-white' : 'bg-dark-blue-700 text-slate-400'
                      }`}
                    >
                      {isProportional ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Posição X</label>
                    <input
                      type="number"
                      value={activeLayer.x}
                      onMouseDown={pushToHistory}
                      onChange={(e) => updateLayer(activeLayer.id, { x: Number(e.target.value) })}
                      className="w-full bg-dark-blue-900 rounded-lg p-2 shadow-neu-sm-in outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Posição Y</label>
                    <input
                      type="number"
                      value={activeLayer.y}
                      onMouseDown={pushToHistory}
                      onChange={(e) => updateLayer(activeLayer.id, { y: Number(e.target.value) })}
                      className="w-full bg-dark-blue-900 rounded-lg p-2 shadow-neu-sm-in outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <label>Rotação</label>
                    <span>{activeLayer.rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={activeLayer.rotation}
                    onMouseDown={pushToHistory}
                    onChange={(e) => updateLayer(activeLayer.id, { rotation: Number(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                </div>

                {activeLayer.type === 'text' ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Texto</label>
                      <input
                        type="text"
                        value={activeLayer.content}
                        onFocus={pushToHistory}
                        onChange={(e) => updateLayer(activeLayer.id, { content: e.target.value })}
                        className="w-full bg-dark-blue-900 rounded-lg p-2 shadow-neu-sm-in outline-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Fonte</label>
                        <select
                          value={activeLayer.fontFamily}
                          onChange={(e) => {
                            pushToHistory();
                            updateLayer(activeLayer.id, { fontFamily: e.target.value });
                          }}
                          className="w-full bg-dark-blue-900 rounded-lg p-2 shadow-neu-sm-in outline-none text-xs"
                        >
                          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Tamanho</label>
                        <input
                          type="number"
                          value={activeLayer.fontSize}
                          onMouseDown={pushToHistory}
                          onChange={(e) => updateLayer(activeLayer.id, { fontSize: Number(e.target.value) })}
                          className="w-full bg-dark-blue-900 rounded-lg p-2 shadow-neu-sm-in outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Cor Texto</label>
                        <input
                          type="color"
                          value={activeLayer.color}
                          onMouseDown={pushToHistory}
                          onChange={(e) => updateLayer(activeLayer.id, { color: e.target.value })}
                          className="w-full h-10 bg-dark-blue-900 rounded-lg p-1 shadow-neu-sm-in cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Cor Fundo (Contraste)</label>
                        <input
                          type="color"
                          value={activeLayer.bgColor}
                          onMouseDown={pushToHistory}
                          onChange={(e) => updateLayer(activeLayer.id, { bgColor: e.target.value })}
                          className="w-full h-10 bg-dark-blue-900 rounded-lg p-1 shadow-neu-sm-in cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Escala / Tamanho</label>
                      <input
                        type="range"
                        min="0.05"
                        max="3"
                        step="0.01"
                        value={activeLayer.scale}
                        onMouseDown={pushToHistory}
                        onChange={(e) => updateLayer(activeLayer.id, { scale: Number(e.target.value) })}
                        className="w-full accent-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => {
                          const img = new Image();
                          img.onload = () => {
                            pushToHistory();
                            const scaleW = PRESETS[preset].width / img.width;
                            const scaleH = PRESETS[preset].height / img.height;
                            updateLayer(activeLayer.id, { 
                              scale: Math.min(scaleW, scaleH) * 0.9, 
                              width: img.width, 
                              height: img.height 
                            });
                          };
                          img.src = activeLayer.content;
                        }}
                        className="py-2 bg-dark-blue-700 hover:bg-dark-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider text-blue-400 transition-colors"
                      >
                        Ajustar
                      </button>
                      <button 
                        onClick={() => {
                          setIsCropping(true);
                          setCropRect({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
                        }}
                        className="py-2 bg-indigo-600/20 hover:bg-indigo-600/40 rounded-lg text-[10px] font-bold uppercase tracking-wider text-indigo-400 border border-indigo-500/30 transition-colors"
                      >
                        Recortar
                      </button>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => deleteLayer(activeLayer.id)}
                  className="w-full py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all border border-red-500/30 text-xs font-bold"
                >
                  Remover Camada
                </button>
              </section>
            )}

            <section className="p-6 bg-dark-blue-800 rounded-3xl shadow-neu-out space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-emerald-400">Ajustes de Foto</h2>
                <button
                  onClick={applyMagicFix}
                  className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl shadow-neu-sm-out hover:scale-105 active:scale-95 transition-all"
                >
                  <svg className="w-4 h-4 text-white group-hover:animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white text-xs font-bold uppercase tracking-tighter">Magic</span>
                </button>
              </div>
              
              <div className="space-y-4 p-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <label>Brilho</label>
                    <span>{brightness}%</span>
                  </div>
                  <input type="range" min="0" max="200" value={brightness} onMouseDown={pushToHistory} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-blue-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <label>Contraste</label>
                    <span>{contrast}%</span>
                  </div>
                  <input type="range" min="0" max="200" value={contrast} onMouseDown={pushToHistory} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-indigo-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <label>Vibração</label>
                    <span>{Math.round(vibrance * 100)}%</span>
                  </div>
                  <input type="range" min="0" max="3" step="0.1" value={vibrance} onMouseDown={pushToHistory} onChange={(e) => setVibrance(Number(e.target.value))} className="w-full accent-emerald-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <label>Aguçar</label>
                    <span>{sharpen}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={sharpen} onMouseDown={pushToHistory} onChange={(e) => setSharpen(Number(e.target.value))} className="w-full accent-yellow-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dark-blue-700">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Moldura</label>
                  <input type="number" value={borderWidth} onMouseDown={pushToHistory} onChange={(e) => setBorderWidth(Number(e.target.value))} className="w-full bg-dark-blue-900 rounded-lg p-2 shadow-neu-sm-in outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Cor</label>
                  <input type="color" value={borderColor} onMouseDown={pushToHistory} onChange={(e) => setBorderColor(e.target.value)} className="w-full h-10 bg-dark-blue-900 rounded-lg p-1 shadow-neu-sm-in cursor-pointer" />
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-3">
              <button onClick={exportImage} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-neu-out font-bold text-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Exportar JPG (c/ Metadados)
              </button>
              <button onClick={exportSVG} className="w-full py-3 bg-dark-blue-700 hover:bg-dark-blue-600 rounded-2xl shadow-neu-out font-bold text-slate-300 transition-all flex items-center justify-center gap-2">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                Exportar SVG
              </button>
            </div>
          </>
        ) : (
          <section className="p-6 bg-dark-blue-800 rounded-3xl shadow-neu-out space-y-6 animate-in fade-in slide-in-from-left-4">
            <h2 className="text-xl font-bold text-blue-400">Modo Recorte</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Arraste os cantos no canvas para definir a nova área da imagem.
            </p>
            <div className="space-y-3">
              <button
                onClick={confirmCrop}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-neu-sm-out font-bold transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Confirmar Recorte
              </button>
              <button
                onClick={() => setIsCropping(false)}
                className="w-full py-3 bg-dark-blue-700 hover:bg-dark-blue-600 text-slate-300 rounded-2xl shadow-neu-sm-out font-bold transition-all"
              >
                Cancelar
              </button>
            </div>
          </section>
        )}
      </div>

      <div className="lg:col-span-8 bg-dark-blue-800 rounded-[3rem] shadow-neu-in p-8 flex flex-col items-center justify-center min-h-[500px]">
        <div className="relative group max-w-full">
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className={`max-w-full max-h-[70vh] shadow-2xl rounded-lg border border-dark-blue-700 bg-black/20 ${isCropping ? 'cursor-crosshair' : 'cursor-move'}`}
          />
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {!isCropping && layers.length > 0 && layers.map((layer, idx) => (
              <button
                key={layer.id}
                onClick={() => setActiveLayerId(layer.id)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-lg ${
                  activeLayerId === layer.id ? 'bg-blue-600 scale-125 border-2 border-white' : 'bg-dark-blue-700 opacity-60'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          {layers.length === 0 && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-center px-10">
                <p className="text-2xl font-bold uppercase tracking-widest">Arraste uma foto ou use o menu ao lado para começar</p>
             </div>
          )}
        </div>
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-slate-400 text-sm font-medium">
            Resolução: <span className="text-blue-400">{PRESETS[preset].width} x {PRESETS[preset].height}</span> • Camadas: <span className="text-indigo-400">{layers.length}</span>
          </p>
          <div className="flex flex-col items-center">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">
              {isCropping ? 'Ajuste a moldura azul para recortar' : 'Dica: Use os handles nos cantos para redimensionar'}
            </p>
            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">
              {!isCropping && activeLayer && (isProportional ? 'Proporção Travada' : 'Redimensionamento Livre Ativado')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
