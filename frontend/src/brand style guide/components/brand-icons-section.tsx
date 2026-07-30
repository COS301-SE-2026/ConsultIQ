import { Link } from "react-router-dom";
import {Search, Settings,Sparkles, Info, ShieldAlert,} from "lucide-react";

interface IconSpecification{
  readonly size: string;
  readonly pixels: string;
  readonly usage: string;
  readonly icon: React.ElementType;
}
const ICON_SIZES: IconSpecification[] = [
{ size: "Inline", pixels: "16px", usage: "Inline metadata, status indicators", icon: Info},
  { size: "Button / Standard ", pixels: "20px", usage: "Action buttons, dropdown triggers, input adornments", icon: Search},
  { size: "Navigation ", pixels: "24px", usage: "Sidebar items, card actions", icon: Settings} ,
  { size: "Feature Highlight ", pixels: "32px", usage: "Modal headers, landing cards", icon: Sparkles } ,
];


export default function BrandIconsSection(){
    return(
        <div className="min-h-screen w-full bg-[var(--color-surface)] text-primary p-6 md:p-12">
            <div className= " max-w-7xl mx-auto mb-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/brand-style-home" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Back Home</Link>
                <Link to="/brand-story-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Brand Story</Link>
                <Link to="/brand-typography-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Typography</Link>
                <Link to="/brand-tone-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Tone</Link>
                <Link to="/brand-spacing-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Spacing</Link>
                <Link to="/brand-colors-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Colors</Link>
                <Link to="/brand-components-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Components</Link>
                <Link to="/brand-logo-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Logo</Link>
                 <Link to="/brand-responsiveness-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Responsiveness</Link>
                <Link to="/brand-changelog-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Changelog</Link>
            </div> 
            <div className="max-w-7xl mx-auto mb-12">
                <h1 className= "text-4xl md:text-5xl font-bold text-primary tracking-tight mb-4">Iconography System</h1>
                <p className="text-base  text-lg text-secondary max-w-7xl leading-relaxed">ConsultIQ utilizes line-based icons from the Lucide library to maintain technical clarity
                  and consistent visual weight across all interface screens.</p>
            </div>
            <div className= " max-w-7xl mx-auto space-y-12">
              <section  className="bg-white rounded-2xl p-8 border border-secondary/10 shadow-sm ">
                <h2 text-xl font-bold text-primary mb-6>Standard Icon Scales</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {ICON_SIZES.map((spec) =>{
                    const Icon= spec.icon;
                    return(
                        <div key={spec.size} className= " p-5 rounded-xl border border-secondary/10 bg-slate-50/50 flex flex-col justify-between ">
                          <div className= "flex items-center justify-between mb-4">
                            <span className=" text-sm font-bold text-primary">{spec.size}</span>
                            <span className=" text-sm font-mono font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">{spec.pixels}</span>
                          </div>
                          <div className="h-16 flex items-center justify-center bg-white rounded-lg border border-secondary/10 mb-3 text-primary">
                            <Icon  size={parseInt(spec.pixels, 10)} strokeWidth={2}/> 
                          </div>
                          <p className= " text-sm text-secondary leading-relaxed">
                            {spec.usage }
                          </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section  className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className= "text-base font-bold text-primary mb-4 flex items-center gap-2">
                    <Info size={18} className= "text-secondary" />Logo Requirements
                  </h3>
                  <ul className= " text-lg text-secondary space-y-3 list-disc list-outside pl-10 leading-relaxed">
                    <li>
                      Standalone icons without text labels <strong>must</strong> include an explicit{" "}
                    <code className="font-mono text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">aria-label</code>{" "}attribute.</li>
                      <li>Decorative icons placed next to text should use{" "}
                        <code className= "font-mono text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">aria-hidden="true"</code>.
                      </li>
                      <li>
                        Icons must follow the same contrast rules as body text: dark navy on light surfaces and white on navy surfaces
                      </li>
                  </ul>
                </div>
                <div className= "  p-6 bg-white rounded-2xl border border-secondary/10 shadow-sm">
                  <h3 className= "text-base font-bold !text-amber-900 mb-4 flex items-center gap-2">
                    <ShieldAlert size={18}/>Forbidden Treatments
                  </h3>
                  <ul className= "text-sm text-amber-800 space-y-3 list-disc list-outside pl-10 leading-relaxed">
                    <li>Do not fill icons with solid colors unless denoting an active/selected tab state.</li>
                    <li>Never stretch or alter the native aspect ratio of icons.</li>
                    <li>Avoid adding heavy drop-shadows or outer glows directly onto line icons.</li>
                  </ul>
                </div>
              </section>
            </div>
        </div>
    );
}