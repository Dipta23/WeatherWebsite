// netlify/functions/news.js

export async function handler(event, context) {
  const API_KEY = "f79eae4b942b4bfeb6a8b97504ca0915"; // Your News API key
  const params = new URLSearchParams(event.queryStringParameters);
  const query = params.get("q") || "India";
  const page = params.get("page") || "1";

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=6&page=${page}&apiKey=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
