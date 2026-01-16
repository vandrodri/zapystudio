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

    const fullPrompt = `professional modern minimalist logo design, ${prompt}, high quality, vector style, clean background, centered, simple, iconic, brand identity`;

    console.log('Chamando HuggingFace API...');

    const response = await fetch(
      "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            num_inference_steps: 30,
            guidance_scale: 7.5,
          }
        }),
      }
    );

    console.log('Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da API HF:", errorText);
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: response.status === 503 
            ? 'Modelo carregando. Aguarde 20 segundos e tente novamente.' 
            : `Erro da API: ${response.status} - ${errorText}`
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
        image: `data:image/png;base64,${base64Image}`
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