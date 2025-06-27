import { cn } from "@/lib/utils";

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 60"
            className={cn("h-8", className)}
            {...props}
        >
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
                </linearGradient>
            </defs>
            <text x="10" y="45" fontFamily="Arial, Helvetica, sans-serif" fontSize="40" fontWeight="bold" fill="url(#grad1)">
                9LIVE
            </text>
            <text x="135" y="30" fontFamily="Arial, Helvetica, sans-serif" fontSize="14" fill="hsl(var(--foreground))">
                SPORTS
            </text>
             <text x="135" y="50" fontFamily="Arial, Helvetica, sans-serif" fontSize="14" fill="hsl(var(--foreground))">
                CLUB
            </text>
            <rect x="0" y="0" width="200" height="60" stroke="hsl(var(--accent))" strokeWidth="2" fill="none" rx="5"/>
        </svg>
    );
}
