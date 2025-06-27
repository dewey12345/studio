import { cn } from "@/lib/utils";

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 280 95"
            className={cn(className)}
            {...props}
        >
            <rect width="280" height="95" fill="black" />
            <rect x="5" y="5" width="270" height="85" fill="none" stroke="white" strokeWidth="3" />
            
            <text 
                x="50%" 
                y="45%" 
                fontFamily="'Arial Black', 'Impact', sans-serif" 
                fontSize="40" 
                fill="white" 
                textAnchor="middle"
                dominantBaseline="central"
            >
                9LIVE
            </text>
            
            <text 
                x="50%" 
                y="75%" 
                fontFamily="'Arial', sans-serif" 
                fontSize="14" 
                fill="white" 
                textAnchor="middle"
                dominantBaseline="central"
                letterSpacing="6"
            >
                SPORTS CLUB
            </text>
        </svg>
    );
}
