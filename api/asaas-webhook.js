// Recebe os avisos de pagamento do Asaas e repassa para o script do Google (planilha de controle).
// O Asaas exige resposta HTTP 200 em até 10 s e não segue redirecionamentos — por isso este
// receptor fica aqui na Vercel. O token do Asaas é conferido no script do Google (nada de segredo aqui).
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyi9OkzuqHJ5NsLBtOaC8-NTS1B18OLM2O9ND3SWrlQPILJpYQ2jAQ2MBlKvG2q4Q3l/exec';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).json({ ok: true, servico: 'Viva+ webhook Asaas' });

  const token = String(req.headers['asaas-access-token'] || '');
  if (!token) return res.status(401).json({ ok: false });

  let evento = req.body;
  if (typeof evento === 'string') { try { evento = JSON.parse(evento); } catch (e) { evento = null; } }
  if (!evento || !evento.event) return res.status(400).json({ ok: false });

  const ctrl = new AbortController();
  const limite = setTimeout(() => ctrl.abort(), 8500);
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ asaasWebhook: true, token, evento }),
      redirect: 'follow',
      signal: ctrl.signal
    });
    const j = await r.json().catch(() => null);
    if (j && j.ok) return res.status(200).json({ ok: true });
    if (j && j.erro === 'token') return res.status(401).json({ ok: false });
    return res.status(500).json({ ok: false });   // o Asaas tenta de novo depois
  } catch (e) {
    return res.status(500).json({ ok: false });
  } finally {
    clearTimeout(limite);
  }
};
