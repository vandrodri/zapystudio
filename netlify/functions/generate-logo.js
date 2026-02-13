exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log('=== INÍCIO DA GERAÇÃO (POLLINATIONS.AI) ===');
    
    const { prompt } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt é obrigatório' })
      };
    }

    console.log('Prompt original:', prompt);

    // Prompt MUITO otimizado para logos (não fotos!)
    const logoPrompt = `simple flat logo icon of ${prompt}, vector graphic, 2D, single solid color on white background, minimalist symbol, geometric shapes only, no text, no 3D, no shading, no gradients, no photography, clean design, iconic`;
    
    const negativePrompt = '&negative=realistic,photo,photograph,3D,shading,gradient,text,words,letters,detailed,complex,busy,cluttered,messy';

    console.log('Prompt otimizado:', logoPrompt);

    // Pollinations.ai - 100% GRÁTIS, sem API key, sem limites!
    const encodedPrompt = encodeURIComponent(logoPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}${negativePrompt}&width=1024&height=1024&nologo=true&model=flux&seed=${Date.now()}`;

    console.log('URL da imagem:', imageUrl);
    console.log('Baixando imagem...');

    // Baixar a imagem
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      console.error('Erro ao baixar imagem:', imageResponse.status);
      return {
        statusCode: imageResponse.status,
        headers,
        body: JSON.stringify({ 
          error: 'Erro ao gerar imagem'
        })
      };
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    console.log('Imagem recebida, tamanho:', imageBuffer.byteLength, 'bytes');

    if (imageBuffer.byteLength === 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Imagem vazia' })
      };
    }

    // Converter para base64
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    console.log('Imagem convertida para base64');
    console.log('=== FIM DA GERAÇÃO ===');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        image: `data:image/jpeg;base64,${base64Image}`
      })
    };

  } catch (error) {
    console.error('=== ERRO GERAL ===');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: `Erro interno: ${error.message}`
      })
    };
  }
};