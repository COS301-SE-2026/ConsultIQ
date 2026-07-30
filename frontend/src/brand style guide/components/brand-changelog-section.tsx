import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function BrandChangeLogSection(){
        return (
        <div className="min-h-screen w-full bg-[var(--color-surface)] text-primary p-6 md:p-12">
            <div className= " max-w-7xl mx-auto mb-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/brand-style-home" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Back Home</Link>
                <Link to="/brand-story-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Brand Story</Link>
                <Link to="/brand-typography-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Typography</Link>
                <Link to="/brand-spacing-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Spacing</Link>
                <Link to="/brand-icons-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Iconography</Link>
                <Link to="/brand-tone-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Tone</Link>
                <Link to="/brand-components-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Components</Link>
                <Link to="/brand-logo-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Logo</Link>
                <Link to="/brand-responsiveness-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Responsiveness</Link>
                <Link to="/brand-colors-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Colors</Link>
            </div>
            <div className= "max-w-5xl mx-auto ">
                <h1 className="text-4xl md:text-4xl font-bold text-primary tracking-tight mb-4">Changelog (Demo 1 to Demo 2)</h1>
                    <div className= "bg-white rounded-xl p-6 border border-secondary/10 shadow-sm space-y-4">
                        <div className= "flex items-center justify-between border-b border-secondary/10 pb-3">
                        <span className="text-sm font-bold uppercase tracking-wider text-secondary">Primary Button Color Update</span>
                        <span className="text-sm font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Updated</span>
                    </div>
                    <div className = "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                        <div className= " flex items-center gap-2">
                            <span className="font-bold text-slate-500 " >Demo 1:</span>
                            <span className =" px-2.5 py-1 rounded bg-[#C9A84C] text-white font-medium">Accent Gold (#C9A84C)</span>
                        </div>
                        <ArrowRight size={16} className = "text-slate-400 hidden sm:block shrink-0"/>
                        <div className= " flex items-center gap-2">
                            <span className="font-bold text-primary " >Demo 2:</span>
                            <span className ="px-2.5 py-1 rounded bg-[#002D62] text-white font-medium">Primary Navy (#002D62)</span>
                        </div>                   
                    </div>
                    <div className= " flex items-start gap-2 text-sm text-secondary pt-1 ">
                        <CheckCircle2  size={15} className="text-emerald-600  mt-0.5 shrink-0" />
                        <p><strong>Rationale:</strong> Switched primary buttons to Primary Navy (`#002D62`) for better WCAG AAA contrast compliance, reserving Accent Gold strictly for highlights and focus indicators.</p>
                    </div>
                </div>
            </div>
        </div>
        );
}
