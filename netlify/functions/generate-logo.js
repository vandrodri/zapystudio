exports.handler = async (event) => {
  // Apenas aceita POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt é obrigatório' })
      };
    }

    const fullPrompt = `professional modern minimalist logo design, ${prompt}, high quality, vector style, clean background, centered, simple, iconic, brand identity`;

    const response = await fetch(
      "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            guidance_scale: 3.5,
            num_inference_steps: 4,
            width: 1024,
            height: 1024,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da API HF:", errorText);
      
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: response.status === 503 
            ? 'Modelo carregando. Tente novamente em 20 segundos.' 
            : 'Erro ao gerar imagem'
        })
      };
    }

    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: `data:image/png;base64,${base64Image}`
      })
    };

  } catch (error) {
    console.error('Erro na function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno do servidor' })
    };
  }
};