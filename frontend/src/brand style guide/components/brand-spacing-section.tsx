import {Box, Layers } from "lucide-react";
import { Link } from "react-router-dom";

interface TokenItem{
    readonly token: string;
    readonly val: string;
    readonly pixels: string;
    readonly usage: string;
}

const SPACING_SCALE: TokenItem[] = [
  {token :"--space-xs", val: "0.25rem", pixels: "4px", usage :" Icon gap ,  badge padding" },
  { token:"--space-sm", val: "0.5rem", pixels: "8px", usage :"Button inline padding , input gaps "},
  { token :"--space-md", val: "1.0rem", pixels: "16px", usage :"Card padding , form layout spacing"},
  { token:"--space-lg", val: "1.5rem", pixels: "24px", usage :"Section margins , modal padding "},
  {token:"--space-xl", val: "2.0rem", pixels: "32px", usage :"Dashboard stats grid gap , major section dividers "},
  {token:"--space-2xl", val: "3.0rem", pixels: "48px", usage: "Hero section padding , page margins"},
];
const RADIUS: TokenItem[] = [
  {token :"--radius-sm", val: "0.375rem", pixels: "6px", usage :"Input fields and small tag pills" },
  {token:"--radius-md", val: "0.5rem", pixels: "8px", usage :"Standard buttons and dropdown menus"},
  {token :"--radius-lg", val: "0.75rem", pixels: "12px", usage :"Content cards"},
  {token:"--radius-xl", val: "1.0rem", pixels: "16px", usage :"Modals and floating panel containers "},
];

export default function BrandSpacingSection(){
    return(
        <div className="min-h-screen w-full bg-[var(--color-surface)] text-primary p-6 md:p-12">
            <div className= " max-w-7xl mx-auto mb-4 ">
                <Link to="/brand-style-home" className= "inline-flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md border borde-white/15 text-sm font-semibold text-accent mb-8">
                    Back to Home</Link>
            </div>            
            <div className="max-w-7xl mx-auto mb-12">  
                <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight mb-4"> Spacing & Design Tokens</h1>
                <p className="text-base  text-lg text-secondary max-w-7xl leading-relaxed">Systematic spatial metrics ensure structural alignment, consistent component rhythm, and predictable responsive layouts across the ConsultIQ platform.</p>
            </div>
        <div className= "max-w-7xl mx-auto space-y-16">
            <section className="bg-white rounded-2xl p-8 border border-secondary/10 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className= "p-3 rounded-xl bg-primary text-white">
                        <Box size={20}/>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-primary">1. Spatial Grid System</h2>
                        <p className= "text-lg text-secondary">Based on an 8-point rhythm scale.</p>
                    </div>
                </div>
                <div className="space-y-4">
                    {SPACING_SCALE.map((item) =>(
                        <div key={item.token} className="grid grid-cols-[400px_1fr_2fr] items-center p-4 rounded-xl border border-secondary/10 bg-slate-50/50 hover:bg-white transition-colors gap-x-6">
                            <div className= "flex items-center gap-8 px-4">
                                <span className="text-sm font-mono font-semibold text-primary whitespace-nowrap">{item.token}</span>
                                <span className="text-sm font-mono text-secondary">{item.val}</span>
                                <span className="text-sm font-mono text-secondary">({item.pixels})</span>

                            </div>
                            
                            <div  className= "flex items-center p">
                                <div className = "h-6 bg-secondary rounded-sm" style={{ width: item.val }}
                                title={`${item.val} (${item.pixels})`}/>
                            </div>
                            <span className= " text-lg text-secondary">{item.usage}</span>

                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-white rounded-2xl p-8 border border-secondary/10 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className= "p-3 rounded-xl bg-primary text-white">
                        <Layers size={20}/>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-primary">2. Border Radii</h2>
                        <p className= "text-lg text-secondary">Standardized corner curvature tokens.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {RADIUS.map((item) =>(
                        <div key={item.token} className="p-5 rounded-2xl border border-secondary/10 bg-slate-50/50 flex flex-col justify-between">
                            <div className= "flex items-center justify-between mb-4">
                                <span className="text-sm font-mono font-semibold text-primary whitespace-nowrap">{item.token}</span>
                                <span className="text-sm font-mono text-secondary">({item.pixels})</span>
                            </div>
                            
                            <div  className= "h-20 w-full bg-[var(--color-primary)]/10 border-2 border-[var(--color-primary)] flex items-center justify-center mb-4 transition-all" style={{ borderRadius: item.val }}>
                            <span className= "text-sm font-mono font-bold text-primary">{item.val}</span>

                        </div>
                        <p className= " text-sm text-primary">{item.usage}</p>
                        </div>
                    ))}
                </div>
            </section>
            
        </div>
        </div>
    );
}



