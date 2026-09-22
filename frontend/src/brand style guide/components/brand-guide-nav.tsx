import { Link } from 'react-router-dom';

const BRAND_NAV_LINKS = [
    { to: "/brand-style-home", label: "Back Home" },
    { to: "/brand-story-section", label: "Brand Story" },
    { to: "/brand-typography-section", label: "Typography" },
    { to: "/brand-spacing-section", label: "Spacing" },
    { to: "/brand-icons-section", label: "Iconography" },
    { to: "/brand-tone-section", label: "Tone" },
    { to: "/brand-logo-section", label: "Logo" },
    { to: "/brand-colors-section", label: "Colors" },
    { to: "/brand-changelog-section", label: "Changelog" },
];

interface BrandGuideNavProps {
    readonly current : string;
}

export default function BrandGuideNav({ current }: BrandGuideNavProps) {
    return(
        <div className = "max-w-7xl mx-auto mb-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {BRAND_NAV_LINKS.filter((link) => link.to !== current).map((link) => (
                <Link 
                    key={link.to}
                    to={link.to}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 rounded-full backdrop-blur-md border text-xs sm:text-sm font-semibold text-accent"
                    >
                        {link.label}
                </Link>
            ))}
        </div>
    );
}