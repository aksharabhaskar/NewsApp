const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5005";

export async function fetchNews({ page, category, query }) {
  const url = new URL(`${BASE_URL}/news`);
  url.searchParams.set("page", page);
  if (category) url.searchParams.set("category", category);
  if (query) url.searchParams.set("q", query);

  const res = await fetch(url);

  if (!res.ok) {
    console.error("Failed to fetch news");
    return { articles: [], stats: { real_count: 0, fake_count: 0, unverified_count: 0 }, fake_news_detected: [] };
  }

  return res.json();
}

export async function detectFakeNews({ image_url, entities, relations }) {
  try {
    const res = await fetch(`${BASE_URL}/detect-fake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url,
        entities,
        relations
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to detect fake news: ${errorText}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error detecting fake news:", error);
    throw error;
  }
}

export async function fetchNodeDetails({ node_label, extraction_data }) {
  try {
    const res = await fetch(`${BASE_URL}/node-details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        node_label,
        extraction_data
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch node details: ${errorText}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching node details:", error);
    throw error;
  }
}
