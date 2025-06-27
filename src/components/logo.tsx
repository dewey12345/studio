import { cn } from "@/lib/utils";

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            className={cn("h-6 w-6", className)}
            {...props}
        >
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
                </linearGradient>
            </defs>
            <path
                d="M20,20 L80,20 L80,80 L20,80 Z"
                stroke="url(#grad1)"
                strokeWidth="12"
                fill="transparent"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <path
                d="M35,35 L65,65"
                stroke="hsl(var(--foreground))"
                strokeWidth="10"
                fill="transparent"
                strokeLinecap="round"
            />
             <path
                d="M65,35 L35,65"
                stroke="hsl(var(--foreground))"
                strokeWidth="10"
                fill="transparent"
                strokeLinecap="round"
            />
        </svg>
    );
}
