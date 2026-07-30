import { Link } from "react-router-dom";

interface ColorToken{
    readonly name: string;
    readonly variable: string;
    readonly hex: string;
    readonly rgb: string;
    readonly hsl: string;
    readonly usage: string;
    readonly contrastRatio: string;
    readonly wcagRating: "AAA" | "AA" | "Fail";
    readonly textOnColor: "#FFFFFF" | "#1F2937"
}
const PRIMARY_COLOR_PALETTE: ColorToken[]=[
    {name: "Dark Blue (Primary)",variable: "--color-primary", hex: "#002D62",rgb: "rgb(0, 45, 98)", hsl: "hsl(212, 100%, 19%)", usage: "Primary navigation, hero sections, primary buttons, page headers", contrastRatio: "14.2:1",wcagRating: "AAA",textOnColor: "#FFFFFF"},
    {name: "Blue (Secondary)",variable: "--color-secondary", hex: "#3C5A8A",rgb: "rgb(60, 90, 138)", hsl: "hsl(217, 39%, 39%)", usage: "Secondary buttons, active tab indicators, hover states, subheadings", contrastRatio: "5.8:1",wcagRating: "AA",textOnColor: "#FFFFFF"},
    {name: "Gold (Accent)",variable: "--color-accent", hex: "#C9A84C",rgb: "rgb(201, 168, 76)", hsl: "hsl(44, 55%, 54%)", usage: "Highlighted text, active tab indicators", contrastRatio: "7.1.1",wcagRating: "AAA",textOnColor: "#1F2937"},
    ];

const NEUTRAL_PALETTE:ColorToken[] = [
    { name: "Surface", variable: "--color-surface", hex: "#F4F6FA", rgb: "rgb(244, 246, 250)",hsl: "hsl(220, 33%, 97%)",  usage: "Main page body background, card containers, subtle panels",contrastRatio: "15.1:1",wcagRating: "AAA", textOnColor: "#1F2937", },
    { name: "Card & Modal Surface", variable: "--color-white",hex: "#FFFFFF", rgb : "rgb(255, 255, 255)", hsl: "hsl(0, 0%, 100%)",usage: "Card background surfaces, modal panels, input backgrounds", contrastRatio: "16.7:1", wcagRating: "AAA", textOnColor: "#1F2937",},
    { name: "Border Subtle", variable: "--color-border", hex: "#E2E8F0",rgb : "rgb(226, 232, 240)",hsl: "hsl(214, 32%, 91%)", usage: "Divider lines, card borders, input field outlines",contrastRatio: "N/A", wcagRating: "AA",textOnColor: "#1F2937", },
    { name: "Dark Grey", variable: "--color-dark-grey", hex: "#4A5568", rgb : "rgb(74, 85, 104)",hsl: "hsl(218, 17%, 35%)",usage: "Secondary labels, dark surface body copy, footer meta text", contrastRatio: "7.2:1", wcagRating: "AAA", textOnColor: "#FFFFFF",},
    { name: "Body Text Primary", variable: "--color-text-primary",hex: "#1F2937",  rgb : "rgb(31, 41, 55)", hsl: "hsl(215, 28%, 17%)", usage: "Primary body text, table content, form input labels", contrastRatio: "16.7:1", wcagRating: "AAA", textOnColor: "#FFFFFF",},
    {name: "Text Secondary / Muted",variable: "--color-text-secondary",hex: "#6B7280", rgb : "rgb(107, 114, 128)", hsl: "hsl(220, 9%, 46%)", usage: "Helper text, disabled icons, metadata timestamps, placeholders", contrastRatio: "4.6:1", wcagRating: "AA",textOnColor: "#FFFFFF", },
];
const SYSTEM_STATUS_PALETTE: ColorToken[] = [
  {name: "Success", variable: "--color-success", hex: "#16A34A", rgb : "rgb(22, 163, 74)", hsl: "hsl(142, 76%, 36%)", usage: "Match confirmed, successful profile creation, active consultant tag",contrastRatio: "4.8:1", wcagRating: "AA", textOnColor: "#FFFFFF",},
  {name: "Warning", variable: "--color-warning",hex: "#F59E0B", rgb : "rgb(245, 158, 11)", hsl: "hsl(38, 92%, 50%)", usage: "Missing profile fields, contract expiring soon, partial skill match", contrastRatio: "3.2:1", wcagRating: "AA", textOnColor: "#1F2937",},
  { name: "Danger ",variable: "--color-danger", hex: "#B91C1C", rgb : "rgb(185, 28, 28)",hsl: "hsl(0, 74%, 42%)", usage: "Remove consultant, delete project, API execution error alerts", contrastRatio: "5.4:1", wcagRating: "AA", textOnColor: "#FFFFFF",},
];

export default function BrandColorsSection(){
    const renderGrid= (tokens: ColorToken[]) =>(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ">
            {tokens.map((token) =>(
                <div key={token.variable} className="rounded-2xl border border-secondary/10 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                    <div className= " h-32 w-full p-4 flex flex-col justify-between relative group cursor-pointer" style={{ backgroundColor: `var(${token.variable})` }}>
                        <div className= " flex items-center justify-between ">
                            <span className= "text-sm font-bold px-2.5 py-1 rounded-full border backdrop-blur-sm"style={{color: token.textOnColor, borderColor: `${token.textOnColor}40`, backgroundColor: `${token.textOnColor}15`,}}>
                                {token.wcagRating} Compliant ({token.contrastRatio})
                            </span>
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="text-lg font-mono font-bold tracking-wider" style={{ color: token.textOnColor}}>{token.hex}</span>
                            <span className= "text-sm font-mono opacity-80" style={{ color: token.textOnColor }}> {token.variable}</span>
                        </div>
                    </div>
                    <div className =" p-5 flex-1 flex flex-col justify-between bg-white">
                        <div>
                            <h3 className= "text-base font-bold text-primary  mb-1">{token.name}</h3>
                            <p className = "text-sm text-secondary leading-relaxed mb-4">{token.usage}</p>
                        </div>
                        <div className="pt-3 border-t border-secondary/10 flex items-center justify-between text-[11px] font-mono text-secondary">
                            <span>{token.rgb}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
    return (
        <div className="min-h-screen w-full bg-[var(--color-surface)] text-primary p-6 md:p-12">
            <div className= " max-w-7xl mx-auto mb-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/brand-style-home" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Back Home</Link>
                <Link to="/brand-story-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Brand Story</Link>
                <Link to="/brand-typography-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Typography</Link>
                <Link to="/brand-spacing-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Spacing</Link>
                <Link to="/brand-icons-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Iconography</Link>
                <Link to="/brand-tone-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border text-sm font-semibold text-accent mb-8">Tone</Link>
                <Link to="/brand-logo-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Logo</Link>
                <Link to="/brand-changelog-section" className= "inline-flex items-center gap-2 px-4 py-1 rounded-full backdrop-blur-md border  text-sm font-semibold text-accent mb-8">Changelog</Link>

            </div>
            <div className= "max-w-7xl mx-auto mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight mb-4">Color Architecture</h1>
                <p className="text-base text-lg text-secondary max-w-7xl leading-relaxed">The ConsultIQ palette relies on enterprise deep navy and steel blue tones to project authority and precision, paired with a gold accent for quality indicators. All combinations are validated for WCAG 2.2 AA contrast compliance.</p>
            </div>
            <div className ="max-w-7xl mx-auto space-y-16">
                <section className="bg-white rounded-2xl p-8 border border-secondary/10 shadow-sm">
                    <div className="mb-6 flex items-center gap-3">
                        <h2 className= "text-2xl font-bold text-primary">1. Primary Brand Palette</h2>
                        <span className= "text-sm font-mono px-3 py-1 rounded-md bg-blue-100 text-blue-800 font-semibold">Core Identity</span>
                    </div>
                    {renderGrid(PRIMARY_COLOR_PALETTE)}
                </section>
            
                <section className="bg-white rounded-2xl p-8 border border-secondary/10 shadow-sm">
                    <div className="mb-6 flex items-center gap-3">
                        <h2 className= "text-2xl font-bold text-primary">2. Neutrals & Surfaces</h2>
                        <span className= "text-sm font-mono px-3 py-1 rounded-md bg-blue-100 text-blue-800 font-semibold">Structure & Content</span>
                    </div>
                    {renderGrid(NEUTRAL_PALETTE)}
                </section>

                <section className="bg-white rounded-2xl p-8 border border-secondary/10 shadow-sm">
                    <div className="mb-6 flex items-center gap-3">
                        <h2 className= "text-2xl font-bold text-primary">3. System Feedback & Status</h2>
                        <span className= "text-sm font-mono px-3 py-1 rounded-md bg-blue-100 text-blue-800 font-semibold">Structure & Content</span>
                    </div>
                    {renderGrid(SYSTEM_STATUS_PALETTE)}
                </section>

            </div>

        </div>
    )
}