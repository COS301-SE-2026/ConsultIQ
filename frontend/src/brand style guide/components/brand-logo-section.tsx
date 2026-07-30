import { Link } from "react-router-dom";
import consultiqLight from "../../assets/logos/ConsultIQ logo.jpeg"
import consultiqDark from "../../assets/logos/ConsultIQ Logo Dark.png"

export default function BrandLogoSection(){
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
                <Link to="/brand-changelog-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Changelog</Link>
                <Link to="/brand-responsiveness-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Responsiveness</Link>
                <Link to="/brand-colors-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Colors</Link>
            </div>
            <div className= "max-w-5xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-primary ">Logo System</h1>
                <div className="bg-white rounded-xl p-6 border border-secondary/10 shadow-sm space-y-6 ">
                    <h2 className = "!text-sm font-bold uppercase tracking-wider text-secondary border-b border-secondary/10 pb-3">1. Official Logo Variants</h2>
                    <div className ="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className ="p-6 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center">
                            <div className= "h-16 flex items-center justify-center mb-3">
                                <img src={consultiqLight} alt="Consultiq Standard Logo" className="max-h-full w-auto object-contain"
                                />
                            </div>
                            <span className= "text-lg font-bold text-primary mb-1">Standard Logo</span>
                            <span className= "text-sm text-secondary">Used on white or light surface backgrounds.</span>
                        </div>
                        <div className ="p-6 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center">
                            <div className= "h-16 flex items-center justify-center mb-3">
                                <img src={consultiqDark} alt="Consultiq Dark Logo" className="max-h-full w-auto object-contain"
                                />
                            </div>
                            <span className= "text-lg font-bold text-primary mb-1">Dark Logo</span>
                            <span className= "text-sm text-secondary">Used on deep navy or dark backgrounds.</span>
                        </div>
                    </div>
                </div>
                <div className ="bg-white rounded-xl p-6 border border-secondary/10 shadow-sm space-y-4">
                    <h2 className= "!text-sm font-bold uppercase tracking-wider text">2. Usage Specifications</h2>
                    <div className = "grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <strong className="block text-primary mb-1">Minimum Size</strong> Digital interface min width: <strong>120px</strong> (Absolute min: <strong>80px</strong>).
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <strong className="block text-primary mb-1">Prohibited Use</strong> Do not stretch, recolor with unapproved gradients, or apply drop shadows.
                        </div>
                    </div>
                </div>
            </div>
        </div>
        );
    }