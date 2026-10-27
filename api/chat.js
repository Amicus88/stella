// 星桥 Stella · Vercel 免费代理
const MaaS_URL = "https://maas-api.cn-huabei-1.xf-yun.com/v2/chat/completions";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "仅支持 POST" }); return; }

  const payload = req.body || {};
  const key = (req.headers["authorization"] || ("Bearer " + (process.env.MAAS_KEY || ""))).trim();
  if (!key || key === "Bearer ") {
    res.status(400).json({ error: "缺少 MaaS 密钥：在 Vercel 环境变量配置 MAAS_KEY，或在 H5 里填写 API Key" });
    return;
  }

  try {
    const upstream = await fetch(MaaS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": key },
      body: JSON.stringify(payload),
    });

    if (payload.stream) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.status(upstream.status);
      const reader = upstream.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(dec.decode(value, { stream: true }));
      }
      res.end();
      return;
    }

    const text = await upstream.text();
    res.status(upstream.status).setHeader("Content-Type", "application/json").send(text);
  } catch (e) {
    res.status(502).json({ error: "代理转发失败：" + e.message });
  }
}
