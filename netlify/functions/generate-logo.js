exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt é obrigatório' })
      };
    }

    // Melhora o prompt com palavras-chave profissionais
    const enhancedPrompt = `
      professional logo design, ${prompt},
      minimalist, clean, modern, iconic symbol,
      vector graphics style, flat design,
      simple geometry, memorable brand identity,
      white or transparent background, centered composition,
      corporate branding, high contrast,
      award winning design, behance, dribbble style,
      ultra sharp, 8k quality
    `.trim().replace(/\s+/g, ' ');

    console.log('Prompt melhorado:', enhancedPrompt);
    
    // Pollinations.ai - API totalmente gratuita, sem necessidade de key
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&enhance=true&model=flux`;

    console.log('Gerando imagem via Pollinations.ai...');

    const response = await fetch(pollinationsUrl);

    if (!response.ok) {
      console.error("Erro ao gerar imagem:", response.status);
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: `Erro ao gerar imagem: ${response.status}`
        })
      };
    }

    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    console.log('Imagem gerada com sucesso!');

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: `data:image/jpeg;base64,${base64Image}`
      })
    };

  } catch (error) {
    console.error('Erro na function:', error);
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Erro interno: ' + error.message
      })
    };
  }
};