import { Link } from "react-router-dom";
import { CheckCircle , XCircle} from "lucide-react";

export default function BrandToneSection(){
    return(
        <div className="min-h-screen w-full bg-[var(--color-surface)] text-primary p-6 md:p-12">
            <div className= " max-w-7xl mx-auto mb-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/brand-style-home" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Back Home</Link>
                <Link to="/brand-story-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Brand Story</Link>
                <Link to="/brand-typography-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Typography</Link>
                <Link to="/brand-spacing-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Spacing</Link>
                <Link to="/brand-icons-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Iconography</Link>
                <Link to="/brand-colors-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Colors</Link>
                <Link to="/brand-components-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Components</Link>
                <Link to="/brand-logo-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Logo</Link>
                 <Link to="/brand-responsiveness-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Responsiveness</Link>
                <Link to="/brand-changelog-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Changelog</Link>
            </div>
            <div className="max-w-7xl mx-auto mb-12">
                <h1 className= "text-4xl md:text-5xl font-bold text-primary tracking-tight mb-4">UI Voice & Copywriting Tone</h1>
                <p className="text-base  text-lg text-secondary max-w-7xl leading-relaxed">Guidance on writing clear, actionable, and professional microcopy for buttons, empty states system tooltips, and diagnostic error alerts</p>
            </div>
            <div className= "max-w-7xl mx-auto space-y-12" >
                <section  className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className= "p-6 bg-white rounded-2xl border border-secondary/10 shadow-sm">
                        <span className="text-sm font-bold text-secondary  uppercase tracking-wider block mb-2">Pillar 1</span>
                        <h2 className= " text-lg font-bold text-primary mb-2">Authoritative & Direct</h2>
                        <p className= "text-sm text-secondary leading-relaxed">Maintain professional enterprise tone. Avoid casual language, slang, or excessive jargon.</p>
                    </div>
                    <div className= "p-6 bg-white rounded-2xl border border-secondary/10 shadow-sm">
                        <span className="text-sm font-bold text-secondary  uppercase tracking-wider block mb-2">Pillar 2</span>
                        <h2 className= " text-lg font-bold text-primary mb-2">Concise & Efficient</h2>
                        <p className= "text-sm text-secondary leading-relaxed">UI labels must communicate their purpose in as few words as possible without sacrificing clarity.</p>
                    </div>       
                    <div className= "p-6 bg-white rounded-2xl border border-secondary/10 shadow-sm">
                        <span className="text-sm font-bold text-secondary  uppercase tracking-wider block mb-2">Pillar 3</span>
                        <h2 className= " text-lg font-bold text-primary mb-2">Actionable Error Handling</h2>
                        <p className= "text-sm text-secondary leading-relaxed">Error messages must state what went wrong and provide explicit steps to resolve the issue.</p>
                    </div>               
                </section>

                <section  className="bg-white rounded-2xl p-8 border border-secondary/10 shadow-sm">
                    <h2 className="text-xl font-bold text-[var(--color-primary)] mb-6">
                        Microcopy Comparison Matrix</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-xl border border-red-200 bg-red-50/40">
                        <div className=" flex items-center gap-2 text-lg font-bold text-red-800 mb-3">
                            <XCircle size={16}/>  Avoid vague and unhelpful error messages
                        </div>
                        <p className= "text-sm font-mono text-red-900 bg-white p-3 rounded-lg border border-red-200 mb-2">Something went wrong while fetching consultants. Please try again later.</p>
                        <p className="text-xs text-red-700 leading-relaxed">Fails to specify why the request failed and leaves the user without an immediate solution. </p>
                    </div>
                    <div className="p-5 rounded-xl border border border-emerald-200 bg-emerald-50/40">
                        <div className=" flex items-center gap-2 text-lg font-bold text-emerald-800 mb-3">
                            <CheckCircle size={16}/>  Actionable
                        </div>
                        <p className= "text-sm font-mono text-red-900 bg-white p-3 rounded-lg border border-red-200 mb-2">Unable to retrieve consultants: try adhusting filter parameters.</p>
                        <p className="text-xs text-emerald-700 leading-relaxed">Identifies the error context clearly and suggests actionable next steps to recover. </p>
                    </div>
                    </div>            
                </section>                
            </div>
        </div>
    );
}