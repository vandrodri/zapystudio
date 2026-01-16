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

    // Prompt otimizado para logos profissionais
    const logoPrompt = `
      logo design, ${prompt},
      vector art, flat design, minimalist,
      simple shapes, geometric, iconic,
      professional branding, corporate identity,
      clean lines, solid colors,
      white background, centered,
      no text, no words, symbol only,
      high quality, sharp edges
    `.trim().replace(/\s+/g, ' ');

    console.log('Gerando logo via Replicate...');

    // Usa FLUX Pro da Replicate - melhor modelo para logos
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'black-forest-labs/flux-1.1-pro',
        input: {
          prompt: logoPrompt,
          aspect_ratio: '1:1',
          output_format: 'png',
          output_quality: 100,
          safety_tolerance: 2,
          prompt_upsampling: true
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Erro Replicate:', error);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Erro ao iniciar geração. Verifique sua API key.'
        })
      };
    }

    const prediction = await response.json();
    console.log('Prediction criada:', prediction.id);

    // Aguarda a geração ficar pronta (polling)
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 60; // 60 segundos max

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          }
        }
      );

      result = await statusResponse.json();
      attempts++;
      
      console.log(`Status (${attempts}s):`, result.status);
    }

    if (result.status === 'failed') {
      console.error('Geração falhou:', result.error);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Falha ao gerar logo. Tente novamente.'
        })
      };
    }

    if (result.status !== 'succeeded') {
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Timeout ao gerar logo. Tente novamente.'
        })
      };
    }

    // Pega a URL da imagem gerada
    const imageUrl = result.output;
    console.log('Imagem gerada:', imageUrl);

    // Baixa a imagem e converte para base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: `data:image/png;base64,${base64Image}`
      })
    };

  } catch (error) {
    console.error('Erro geral:', error);
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Erro interno: ' + error.message
      })
    };
  }
};