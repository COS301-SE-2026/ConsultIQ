import {Type} from "lucide-react";

interface FontType{
    readonly level: string;
    readonly variable: string;
    readonly size: string;
    readonly weight: string;
    readonly lineHeight: string;
    readonly tracking: string;
    readonly usage : string;
    readonly sampleText: string;
}

const FONT_SCALE: FontType[]=[
    { level: "Display /H1", variable:"--text-h1", size: "2.5rem (40px)", weight: "700 (Bold)", lineHeight:"1.2", tracking: "-0.02em", usage: "Headers, Section title", sampleText: "Consultant Scoring Engine"},
    { level: "Heading 2 /H2", variable:"--text-h2", size: "2.0rem (32px)", weight: "700 (Bold)", lineHeight:"1.25", tracking: "-0.01em", usage: "Card modal titles", sampleText: "Algorithm Configurations"},
    { level: "Heading 3 /H3", variable:"--text-h3", size: "1.5rem (24px)", weight: "600 (Semibold)", lineHeight:"1.3", tracking: "normal", usage: "Table headers", sampleText: "Top Matches"},
    { level: "Heading 4 /H4", variable:"--text-h4", size: "1.25rem (20px)", weight: "600 (Semibold)", lineHeight:"1.4", tracking: "normal", usage: "Secondary label", sampleText: "Project Name"},
    { level: "Body Base", variable:"--text-body", size: "1.0rem (16px)", weight: "400 (Regular)", lineHeight:"1.5", tracking: "normal", usage: "Form input contents ", sampleText: "Enter email"},
    { level: "Body Small /Caption", variable:"--text-sm", size: "0.875rem (16px)", weight: "400 (Regular)", lineHeight:"1.4", tracking: "0.01em", usage: "Helper text", sampleText: "Profule created!"},
]

export default function BrandTypographySection(){

    return(
        <div className="min-h-screen w-full bg-surface text-primary p-6 md:p-12">            
            <div className="max-w-7xl mx-auto mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight mb-4">Typography System </h1>
                <p className="text-lg text-base max-w-7xl leading-relaxed">The ConsultIQ typographic hierarchy utilizes clean, high-legibility sans-serif typefaces optimized for data-dense dashboards and enterprise reporting workflows.</p>
            </div>
                <div className=" max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">               
                    <div className= "bg-white rounded-2xl p-6 border border-secondary/10 shadow-sm">
                        <div className= "flex items-center gap-3 mb-4">
                            <div className=" p-2 rounded-xl bg-primary text-white">
                                <Type size={20} />
                            </div>
                            <div>
                                <h3 className= "text-lg font-bold text-primary">Primary Sans-Serif</h3>
                                <p className="text-sm font-mono text-secondary mb-2">var(--font-primary)</p>
                            </div>
                        </div>
                        <p className="text-4xl font-sans font-bold text-primary mb-2">Aa Bb Cc 123</p>
                        <p className="text-sm text-secondary">Used for all interface controls, headings, body text, and interactive buttons.</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-secondary/10 shadow-sm shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-primary text-white">
                                <Type size={20} />
                            </div>
                            <div>
                                <h3 className= "text-lg font-bold text-primary">Monospace Code</h3>
                                <p className="text-sm font-mono text-secondary mb-2">var(--font-mono)</p>
                            </div>
                        </div>
                    <p className= "text-4xl font-mono font-bold text-secondary mb-2">0123 {} % &gt;</p>
                    <p className="text-sm text-secondary">Reserved for score calculations, code blocks, and tabular metrics.</p>
                    </div>
            </div>
            <div className="max-w-7xl mx-auto " >
                <h2 className="text-2xl font-bold text-primary mb-6">
                    Type Scale Hierarchy</h2>
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                {FONT_SCALE.map((font) =>(
                    <div key={font.variable} className= "bg-white border rounded-2xl border-secondary/10 p-6 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-secondary pb-4 mb-4">                            
                            <div className= "flex items-center gap-3">
                               <span className="text-sm font-bold text-primary">{font.level}</span> 
                                <span className="text-sm font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">{font.size}</span> 
                               <span className="text-sm font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800">Weight: {font.weight}</span>
                            </div>
                        </div>
                        
                        <div className="mb-4 overflow-x-auto">
                            <p style={{fontSize: font.size.split(" ")[0], fontWeight: font.weight.split(" ")[0], lineHeight: font.lineHeight, letterSpacing: font.tracking,}} 
                            className={font.variable === "--font-mono" ? "font-mono text-slate-800" : "text-primary"}>
                             {font.sampleText}</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-secondary font-mono pt-2">                            <span>Line Height: {font.lineHeight}</span>
                            <span>Letter Spacing: {font.tracking}</span>
                            <span className="font-sans text-secondary italic">Usage: {font.usage}</span>                            
                        </div>
                    </div>
                ))}

            </div>
            </div>
        </div>
    );}