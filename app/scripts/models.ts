// Lists the NVIDIA models your Token Factory key can use, to fill NEMOTRON_*_MODEL env vars.
const base = process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1/";
const res = await fetch(new URL("models", base), { headers: { authorization: `Bearer ${process.env.NEBIUS_API_KEY}` } });
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
const { data } = (await res.json()) as { data: { id: string }[] };
console.log(data.map((m) => m.id).filter((id) => /nvidia|nemotron/i.test(id)).sort().join("\n"));
export {};
