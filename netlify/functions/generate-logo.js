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

    // Lista de APIs gratuitas para tentar (em ordem de preferência)
    const apis = [
      {
        name: 'Pollinations FLUX',
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&enhance=true&model=flux`
      },
      {
        name: 'Pollinations Turbo',
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&model=turbo`
      },
      {
        name: 'Prodia',
        url: `https://api.prodia.com/generate`,
        method: 'POST',
        body: {
          prompt: enhancedPrompt,
          model: "sd_xl_base_1.0.safetensors",
          negative_prompt: "blurry, low quality, watermark, text",
          steps: 20,
          cfg_scale: 7,
          seed: -1,
          sampler: "DPM++ 2M Karras",
          width: 1024,
          height: 1024
        }
      },
      {
        name: 'Hercai',
        url: `https://hercai.onrender.com/v3/text2image?prompt=${encodeURIComponent(enhancedPrompt)}`
      }
    ];

    // Tenta cada API até uma funcionar
    for (const api of apis) {
      try {
        console.log(`Tentando API: ${api.name}`);
        
        let response;
        if (api.method === 'POST' && api.body) {
          response = await fetch(api.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(api.body)
          });
        } else {
          response = await fetch(api.url);
        }

        if (response.ok) {
          console.log(`✓ Sucesso com ${api.name}`);
          
          // Para APIs que retornam JSON com URL da imagem
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            // Hercai retorna {url: "..."}
            if (data.url) {
              const imageResponse = await fetch(data.url);
              const imageBuffer = await imageResponse.arrayBuffer();
              const base64Image = Buffer.from(imageBuffer).toString('base64');
              
              return {
                statusCode: 200,
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: `data:image/jpeg;base64,${base64Image}` })
              };
            }
            
            // Prodia retorna {job: "id"} - precisa fazer polling
            if (data.job) {
              // Aguarda alguns segundos
              await new Promise(resolve => setTimeout(resolve, 3000));
              const resultResponse = await fetch(`https://api.prodia.com/job/${data.job}`);
              const resultData = await resultResponse.json();
              
              if (resultData.imageUrl) {
                const imageResponse = await fetch(resultData.imageUrl);
                const imageBuffer = await imageResponse.arrayBuffer();
                const base64Image = Buffer.from(imageBuffer).toString('base64');
                
                return {
                  statusCode: 200,
                  headers: { ...headers, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ image: `data:image/jpeg;base64,${base64Image}` })
                };
              }
            }
          } else {
            // API retorna a imagem diretamente
            const imageBuffer = await response.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');

            return {
              statusCode: 200,
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: `data:image/jpeg;base64,${base64Image}` })
            };
          }
        } else {
          console.log(`✗ Falhou com ${api.name}: ${response.status}`);
        }
      } catch (error) {
        console.log(`✗ Erro com ${api.name}:`, error.message);
        continue; // Tenta próxima API
      }
    }

    // Se todas falharam
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Todas as APIs estão temporariamente indisponíveis. Aguarde alguns minutos e tente novamente.'
      })
    };

  } catch (error) {
    console.error('Erro geral na function:', error);
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Erro interno: ' + error.message
      })
    };
  }
};