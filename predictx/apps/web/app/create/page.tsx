"use client";
import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const CATEGORIES = ["crypto","sports","politics","tech","entertainment","other"];

export default function CreateMarketPage() {
  const { authenticated, login, user } = usePrivy();
  const address = user?.wallet?.address;

  const [question, setQuestion]       = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory]       = useState("crypto");
  const [resolvesAt, setResolvesAt]   = useState("");
  const [liquidity, setLiquidity]     = useState("50");
  const [validating, setValidating]   = useState(false);
  const [validation, setValidation]   = useState<any>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState("");

  if (!authenticated) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", textAlign:"center" }}>
        <div style={{ fontSize:56, marginBottom:20 }}>🔒</div>
        <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:32, fontWeight:800, color:"#fff", marginBottom:10 }}>Connect your wallet</h1>
        <p style={{ color:"#666", fontSize:15, marginBottom:28, fontFamily:"Space Grotesk,sans-serif" }}>You need a wallet to create a market</p>
        <button onClick={() => login()} style={{ background:"#FFD60A", color:"#000", fontWeight:700, fontSize:15, padding:"12px 32px", borderRadius:12, border:"none", cursor:"pointer", fontFamily:"Space Grotesk,sans-serif" }}>
          Connect wallet
        </button>
      </div>
    );
  }

  const validate = async () => {
    if (!question.trim()) return;
    setValidating(true);
    setValidation(null);
    try {
      const r = await fetch(`${API}/api/markets/validate`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ question }),
      });
      const d = await r.json();
      setValidation(d.data);
    } catch { setValidation({ valid:false, reason:"Service unavailable" }); }
    finally { setValidating(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !description || !resolvesAt || !address) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/markets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          description,
          category,
          resolvesAt,
          creatorAddress: address,
          initLiquidity: liquidity,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error ?? "Failed to create market");
      }
    } catch (err: any) {
      setError("Network error — is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  const inp: React.CSSProperties = {
    width:"100%", background:"#1A1A1A", border:"1px solid #232323",
    borderRadius:10, padding:"12px 14px", color:"#fff", fontSize:14,
    fontFamily:"Space Grotesk,sans-serif", outline:"none", boxSizing:"border-box",
  };

  const card: React.CSSProperties = {
    background:"#141414", border:"1px solid #232323",
    borderRadius:14, padding:24, marginBottom:16,
  };

  if (success) return (
    <div style={{ ...card, textAlign:"center", padding:60 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
      <h2 style={{ fontFamily:"Syne,sans-serif", fontSize:24, color:"#22c55e", marginBottom:10 }}>Market created!</h2>
      <p style={{ color:"#666", fontFamily:"Space Grotesk,sans-serif", marginBottom:20 }}>Your market is now live on PredictX</p>
      <button onClick={() => { setSuccess(false); setQuestion(""); setDescription(""); }} style={{ background:"#FFD60A", color:"#000", fontWeight:700, fontSize:14, padding:"11px 24px", borderRadius:10, border:"none", cursor:"pointer", fontFamily:"Space Grotesk,sans-serif" }}>
        Create another
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth:680, padding:"0 0 40px" }}>
      <h1 style={{ fontFamily:"Syne,sans-serif", fontSize:36, fontWeight:800, color:"#fff", marginBottom:6 }}>
        Create a <span style={{ color:"#FFD60A" }}>market</span>
      </h1>
      <p style={{ color:"#666", fontSize:14, marginBottom:32, fontFamily:"Space Grotesk,sans-serif" }}>
        Ask a binary question. Let the crowd decide.
      </p>

      <form onSubmit={submit}>
        <div style={card}>
          <h2 style={{ fontFamily:"Syne,sans-serif", fontSize:16, fontWeight:700, color:"#fff", marginBottom:16 }}>Question</h2>
          <textarea rows={3} placeholder="Will Bitcoin exceed $150,000 before December 31, 2026?"
            value={question} onChange={e => { setQuestion(e.target.value); setValidation(null); }}
            style={{ ...inp, resize:"none" }} />
          <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:10 }}>
            <button type="button" onClick={validate} disabled={!question.trim()||validating}
              style={{ background:"rgba(255,214,10,0.1)", border:"1px solid rgba(255,214,10,0.3)", color:"#FFD60A", fontWeight:600, fontSize:13, padding:"8px 16px", borderRadius:8, cursor:"pointer", fontFamily:"Space Grotesk,sans-serif", opacity:validating?0.6:1 }}>
              {validating ? "Validating..." : "✨ AI Validate"}
            </button>
            {validation && (
              <span style={{ fontSize:13, color:validation.valid?"#22c55e":"#ef4444", fontFamily:"Space Grotesk,sans-serif" }}>
                {validation.valid ? "✓ Valid" : `✗ ${validation.reason}`}
              </span>
            )}
          </div>
          {validation?.improvedQuestion && (
            <button type="button" onClick={() => { setQuestion(validation.improvedQuestion); setValidation(null); }}
              style={{ marginTop:8, background:"transparent", border:"none", color:"#FFD60A", fontSize:12, cursor:"pointer", fontFamily:"Space Grotesk,sans-serif", textDecoration:"underline" }}>
              Use improved version
            </button>
          )}
          <div style={{ marginTop:16 }}>
            <label style={{ fontSize:11, color:"#666", display:"block", marginBottom:6, fontFamily:"Space Grotesk,sans-serif" }}>Resolution criteria</label>
            <textarea rows={2} placeholder="Resolves YES if BTC/USD on Coinbase reaches $150,000..."
              value={description} onChange={e => setDescription(e.target.value)}
              style={{ ...inp, resize:"none" }} />
          </div>
        </div>

        <div style={card}>
          <h2 style={{ fontFamily:"Syne,sans-serif", fontSize:16, fontWeight:700, color:"#fff", marginBottom:16 }}>Category</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {CATEGORIES.map(cat => (
              <button key={cat} type="button" onClick={() => setCategory(cat)} style={{
                padding:"10px 14px", borderRadius:10, fontWeight:600, fontSize:13,
                cursor:"pointer", fontFamily:"Space Grotesk,sans-serif",
                textTransform:"capitalize",
                background: category===cat?"rgba(255,214,10,0.1)":"#1A1A1A",
                border: category===cat?"1px solid rgba(255,214,10,0.3)":"1px solid #232323",
                color: category===cat?"#FFD60A":"#666",
              }}>{cat}</button>
            ))}
          </div>
        </div>

        <div style={card}>
          <h2 style={{ fontFamily:"Syne,sans-serif", fontSize:16, fontWeight:700, color:"#fff", marginBottom:16 }}>Details</h2>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div>
              <label style={{ fontSize:11, color:"#666", display:"block", marginBottom:6, fontFamily:"Space Grotesk,sans-serif" }}>Resolves at</label>
              <input type="datetime-local" value={resolvesAt} onChange={e => setResolvesAt(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize:11, color:"#666", display:"block", marginBottom:6, fontFamily:"Space Grotesk,sans-serif" }}>Initial liquidity (USDC)</label>
              <input type="number" min="50" value={liquidity} onChange={e => setLiquidity(e.target.value)} style={inp} />
              <p style={{ fontSize:11, color:"#444", marginTop:4, fontFamily:"Space Grotesk,sans-serif" }}>Minimum 50 USDC</p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={submitting||!question||!description||!resolvesAt} style={{
          width:"100%", padding:"14px 0", background:"#FFD60A", color:"#000",
          fontWeight:700, fontSize:16, borderRadius:12, border:"none", cursor:"pointer",
          fontFamily:"Space Grotesk,sans-serif", opacity:submitting?0.7:1, transition:"all 0.15s",
        }}>
          {submitting ? "Creating market..." : `Create market · ${liquidity} USDC`}
        </button>
        <p style={{ textAlign:"center", color:"#444", fontSize:11, marginTop:10, fontFamily:"Space Grotesk,sans-serif" }}>
          2% of all trades go to the market creator
        </p>
      </form>
    </div>
  );
}
